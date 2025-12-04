from flask import Flask, render_template, request, jsonify, send_file, make_response
import os
import json
import tempfile
from music21 import converter, stream, environment, chord, note, roman, meter, interval, analysis, key, clef
from collections import Counter
import xml.etree.ElementTree as ET
import datetime
import io
from openai import OpenAI

app = Flask(__name__)

# Configuration
CONFIG_FILE = 'config.json'
AI_MODELS_CONFIG_FILE = 'config/ai_models.json'

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_config(data):
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(data, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving config: {e}")
        return False

def load_ai_models_config():
    """Load AI model configurations from separate config file."""
    if os.path.exists(AI_MODELS_CONFIG_FILE):
        try:
            with open(AI_MODELS_CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading AI models config: {e}")
            return {}
    return {}

def obter_titulo_do_xml(file_path):
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()

        for credit in root.findall("credit"):
            credit_type = credit.find("credit-type")
            if credit_type is not None and credit_type.text == "title":
                credit_words = credit.find("credit-words")
                if credit_words is not None:
                    return credit_words.text
    except:
        pass
    return "Untitled"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/settings', methods=['GET'])
def get_settings():
    user_settings = load_config()
    ai_models_config = load_ai_models_config()
    
    # Merge configs: user settings override defaults
    merged_config = {}
    
    # Add AI model defaults
    if 'remote' in ai_models_config:
        merged_config['remoteApiUrl'] = user_settings.get('remoteApiUrl', ai_models_config['remote'].get('api_url'))
        merged_config['remoteApiKey'] = user_settings.get('remoteApiKey', ai_models_config['remote'].get('api_key'))
        merged_config['remoteModel'] = user_settings.get('remoteModel', ai_models_config['remote'].get('default_model'))
    
    if 'local' in ai_models_config:
        merged_config['localApiUrl'] = user_settings.get('localApiUrl', ai_models_config['local'].get('api_url'))
        merged_config['localApiKey'] = user_settings.get('localApiKey', ai_models_config['local'].get('api_key'))
        merged_config['localModel'] = user_settings.get('localModel', ai_models_config['local'].get('default_model'))
    
    # Add other user settings
    merged_config['contextPhrases'] = user_settings.get('contextPhrases', '\n'.join(ai_models_config.get('context_phrases', [])))
    merged_config['theme'] = user_settings.get('theme', 'dark')
    merged_config['agent'] = user_settings.get('agent', 'remote')
    
    # Add AI prompts from ai_models.json (these can be overridden by user)
    prompts = ai_models_config.get('prompts', {})
    if user_settings.get('aiPrompts'):
        prompts.update(user_settings['aiPrompts'])
    merged_config['aiPrompts'] = prompts
    
    return jsonify(merged_config)

@app.route('/settings', methods=['POST'])
def update_settings():
    data = request.json
    if save_config(data):
        return jsonify({'status': 'success'})
    return jsonify({'status': 'error', 'message': 'Failed to save settings'}), 500

@app.route('/api/prompts', methods=['GET'])
def get_prompts():
    """Get all configurable AI prompts"""
    ai_models_config = load_ai_models_config()
    prompts = ai_models_config.get('prompts', {})
    return jsonify(prompts)

@app.route('/api/prompts', methods=['POST'])
def update_prompts():
    """Update AI prompts in config file"""
    try:
        data = request.json
        ai_models_config = load_ai_models_config()
        ai_models_config['prompts'] = data
        
        # Save back to ai_models.json
        with open(AI_MODELS_CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(ai_models_config, f, indent=2, ensure_ascii=False)
        
        return jsonify({'status': 'success', 'message': 'Prompts updated successfully'})
    except Exception as e:
        print(f"Error updating prompts: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file sent'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, file.filename)
    file.save(file_path)

    try:
        score = converter.parse(file_path)

        total_instruments = len(score.parts)
        instrument_names = [p.partName if p.partName else f"Part {i+1}" for i, p in enumerate(score.parts)]

        overall_key = score.analyze('key')
        total_measures = len(score.parts[0].getElementsByClass('Measure')) if score.parts else 0

        time_signatures = set()
        first_time_signature = None
        measure_duration_beats = 4  # Default value
        
        for ts in score.recurse().getElementsByClass(meter.TimeSignature):
            time_signatures.add(ts.ratioString)
            if first_time_signature is None:
                first_time_signature = ts
                measure_duration_beats = ts.numerator

        result = {
            'title': obter_titulo_do_xml(file_path),
            'total_instruments': total_instruments,
            'instrument_names': instrument_names,
            'overall_key': f"{overall_key.tonic.name} {overall_key.mode}",
            'total_measures': total_measures,
            'time_signatures': list(time_signatures),
            'first_time_signature': f"{measure_duration_beats}/{first_time_signature.denominator if first_time_signature else 4}",
            'measure_duration_beats': measure_duration_beats,
            'file_path': file_path
        }

        return jsonify(result)

    except Exception as e:
        try:
            os.remove(file_path)
            os.rmdir(temp_dir)
        except:
            pass
        return jsonify({'error': str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    file_path = data.get('file_path')
    harmonic_parts = data.get('harmonic_parts', [])
    analyze_intervals = data.get('analyze_intervals', False)
    analyze_direction = data.get('analyze_direction', False)
    analyze_rhythm = data.get('analyze_rhythm', False)

    if not file_path or not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 400

    try:
        score = converter.parse(file_path)

        part_indices = [int(idx) for idx in harmonic_parts]

        total_instruments = len(score.parts)
        instrument_names = [p.partName if p.partName else f"Part {i+1}" for i, p in enumerate(score.parts)]

        overall_key = score.analyze('key')
        total_measures = len(score.parts[0].getElementsByClass('Measure')) if score.parts else 0

        time_signatures = set()
        first_time_signature = None
        measure_duration_beats = 4  # Default value
        
        for ts in score.recurse().getElementsByClass(meter.TimeSignature):
            time_signatures.add(ts.ratioString)
            if first_time_signature is None:
                first_time_signature = ts
                measure_duration_beats = ts.numerator

        notes_per_instrument = {}
        for p in score.parts:
            notas = p.recurse().notes
            notes_per_instrument[p.partName if p.partName else "Part"] = len(notas)

        melodic_analysis = {}

        for p in score.parts:
            name = p.partName if p.partName else "Part"
            melodic_analysis[name] = {}

        if analyze_intervals or analyze_direction:
            for p in score.parts:
                name = p.partName if p.partName else "Part"
                notes_list = [n for n in p.recurse().notes if isinstance(n, note.Note)]

                interval_counter = Counter()
                ascending = descending = 0

                for i in range(1, len(notes_list)):
                    intv = interval.Interval(notes_list[i - 1], notes_list[i])
                    interval_name = intv.directedName

                    if analyze_intervals:
                        interval_counter[interval_name] += 1

                    if analyze_direction:
                        if intv.semitones > 0:
                            ascending += 1
                        elif intv.semitones < 0:
                            descending += 1

                total_moves = ascending + descending
                mean_direction = (ascending - descending) / total_moves if total_moves > 0 else 0

                melodic_analysis[name]["intervals"] = dict(interval_counter.most_common())
                melodic_analysis[name]["ascending"] = ascending
                melodic_analysis[name]["descending"] = descending
                melodic_analysis[name]["mean_direction"] = round(mean_direction, 2)

        if analyze_rhythm:
            for p in score.parts:
                name = p.partName if p.partName else "Part"
                notes_list = [n for n in p.recurse().notes if isinstance(n, note.Note)]

                rhythmic_values = Counter()
                total_notes = len(notes_list)
                total_measures_part = len(p.getElementsByClass('Measure'))

                for n in notes_list:
                    duration = n.quarterLength
                    if duration >= 4.0:
                        value_name = "Whole Note"
                    elif duration >= 2.0:
                        value_name = "Half Note"
                    elif duration >= 1.0:
                        value_name = "Quarter Note"
                    elif duration >= 0.5:
                        value_name = "Eighth Note"
                    elif duration >= 0.25:
                        value_name = "Sixteenth Note"
                    else:
                        value_name = "Smaller value"

                    rhythmic_values[value_name] += 1

                density = total_notes / total_measures_part if total_measures_part > 0 else 0

                melodic_analysis[name]["rhythm"] = {
                    "values": dict(rhythmic_values.most_common()),
                    "density": round(density, 2)
                }

        reduction = stream.Score()
        for i in part_indices:
            if i < len(score.parts):
                reduction.append(score.parts[i])

        reduction_key = reduction.analyze('key') if len(reduction.parts) > 0 else overall_key

        chord_report = []
        if len(reduction.parts) > 0:
            for m in reduction.parts[0].getElementsByClass('Measure'):
                chords = m.chordify()
                measure_info = []
                last_chord = None

                for c in chords.flatten().getElementsByClass('Chord'):
                    if not c.isRest and (last_chord is None or c.forteClass != last_chord.forteClass):
                        measure_info.append(c)
                        last_chord = c

                chord_report.append(measure_info)

        selected_instruments = []
        for i in part_indices:
            if i < len(score.parts):
                selected_instruments.append(instrument_names[i])

        result = {
            'title': obter_titulo_do_xml(file_path),
            'general_info': {
                'total_instruments': total_instruments,
                'instrument_names': instrument_names,
                'overall_key': f"{overall_key.tonic.name} {overall_key.mode}",
                'total_measures': total_measures,
                'time_signatures': list(time_signatures),
                'first_time_signature': f"{measure_duration_beats}/{first_time_signature.denominator if first_time_signature else 4}",
                'measure_duration_beats': measure_duration_beats,
                'notes_per_instrument': notes_per_instrument
            },
            'melodic_analysis': melodic_analysis,
            'harmonic_analysis': {
                'selected_instruments': selected_instruments,
                'reduction_key': f"{reduction_key.tonic.name} {reduction_key.mode}" if len(reduction.parts) > 0 else "N/A",
                'chord_report': []
            }
        }

        for idx, chords in enumerate(chord_report):
            measure_data = {
                'measure': idx + 1,
                'chords': [],
                'tonal_functions': []
            }

            if not chords:
                measure_data['chords'].append("No chords")
                measure_data['tonal_functions'].append("No tonal functions")
            else:
                for c in chords:
                    try:
                        measure_data['chords'].append(c.pitchedCommonName)
                    except:
                        measure_data['chords'].append("Unknown chord")

                    try:
                        rn = roman.romanNumeralFromChord(c, reduction_key)
                        measure_data['tonal_functions'].append(rn.figure)
                    except:
                        measure_data['tonal_functions'].append("Unknown")

            result['harmonic_analysis']['chord_report'].append(measure_data)

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download_report', methods=['POST'])
def download_report():
    try:
        data = request.json

        report_lines = []
        report_lines.append("=== SCORE REPORT ===\n\n")
        report_lines.append(f"Title: {data.get('title', 'Untitled')}\n\n")

        general_info = data.get('general_info', {})
        report_lines.append(">>> GENERAL INFORMATION <<<\n")
        report_lines.append(f"Total number of instruments: {general_info.get('total_instruments', 0)}\n")
        report_lines.append("Instruments:\n")
        for name in general_info.get('instrument_names', []):
            report_lines.append(f"- {name}\n")

        report_lines.append(f"\nOverall key: {general_info.get('overall_key', 'Unknown')}\n")
        report_lines.append(f"Number of measures: {general_info.get('total_measures', 0)}\n")
        report_lines.append("Time signature(s):\n")
        for ts in general_info.get('time_signatures', []):
            report_lines.append(f"- {ts}\n")

        report_lines.append("\nNotes per instrument:\n")
        for instr, qty in general_info.get('notes_per_instrument', {}).items():
            report_lines.append(f"- {instr}: {qty} notes\n")

        report_lines.append("\n\n>>> MELODIC ANALYSIS <<<\n")
        melodic_analysis = data.get('melodic_analysis', {})
        for instr, analysis_data in melodic_analysis.items():
            report_lines.append(f"\nInstrument: {instr}\n")

            if 'intervals' in analysis_data and analysis_data['intervals']:
                report_lines.append("Most common intervals:\n")
                for interval_name, count in analysis_data['intervals'].items():
                    report_lines.append(f"- {interval_name}: {count} times\n")

            if 'ascending' in analysis_data:
                report_lines.append("Melodic direction:\n")
                report_lines.append(f"- Ascending: {analysis_data['ascending']}\n")
                report_lines.append(f"- Descending: {analysis_data['descending']}\n")
                report_lines.append(f"- Mean direction: {analysis_data['mean_direction']:.2f}\n")

            if 'rhythm' in analysis_data:
                report_lines.append("Rhythm:\n")
                rhythm_data = analysis_data['rhythm']
                for value_name, count in rhythm_data['values'].items():
                    report_lines.append(f"- {value_name}: {count} times\n")
                report_lines.append(f"- Average density: {rhythm_data['density']:.2f} notes per measure\n")

        harmonic_analysis = data.get('harmonic_analysis', {})
        if harmonic_analysis.get('selected_instruments'):
            report_lines.append("\n\n>>> HARMONIC REDUCTION ANALYSIS <<<\n")
            report_lines.append("Selected instruments:\n")
            for instr in harmonic_analysis['selected_instruments']:
                report_lines.append(f"- {instr}\n")

            report_lines.append(f"\nReduction key: {harmonic_analysis.get('reduction_key', 'N/A')}\n")
            report_lines.append(f"Number of measures in reduction: {len(harmonic_analysis.get('chord_report', []))}\n")

            report_lines.append("\nChords per measure:\n")
            for measure_data in harmonic_analysis.get('chord_report', []):
                report_lines.append(f"\nMeasure {measure_data['measure']}: ")
                report_lines.append(", ".join(measure_data['chords']))

            report_lines.append("\n\nTonal functions per measure:\n")
            for measure_data in harmonic_analysis.get('chord_report', []):
                report_lines.append(f"\nMeasure {measure_data['measure']}: ")
                report_lines.append(", ".join(measure_data['tonal_functions']))

        report_lines.append("\n\n>>> INTERVAL EXPLANATION <<<\n")
        report_lines.append("\nMelodic intervals are represented by codes composed of a letter and a number:\n\n")
        report_lines.append("P = Perfect\nM = Major\nm = Minor\n\n")
        report_lines.append("Examples:\n")
        report_lines.append("- P1 → Unison (same note repeated)\n")
        report_lines.append("- m2 → Minor second ascending\n")
        report_lines.append("- m-2 → Minor second descending\n")
        report_lines.append("- M2 → Major second ascending\n")
        report_lines.append("- M-2 → Major second descending\n")
        report_lines.append("- m3 → Minor third ascending\n")
        report_lines.append("- m-3 → Minor third descending\n")
        report_lines.append("- P4 → Perfect fourth ascending\n")
        report_lines.append("- P-4 → Perfect fourth descending\n")
        report_lines.append("- P5 → Perfect fifth ascending\n")
        report_lines.append("- P-5 → Perfect fifth descending\n")
        report_lines.append("- m6 → Minor sixth ascending\n")
        report_lines.append("- M6 → Major sixth ascending\n")
        report_lines.append("- m-7 → Minor seventh descending\n")
        report_lines.append("- P8 → Perfect octave ascending\n")
        report_lines.append("- P-8 → Perfect octave descending\n\n")
        report_lines.append("Melodic direction indicates the number of ascending and descending movements recorded, as well as the general trend (mean direction):\n")
        report_lines.append("- Positive value → ascending trend\n")
        report_lines.append("- Negative value → descending trend\n")
        report_lines.append("- Value close to zero → no predominant trend\n")

        report_content = ''.join(report_lines)

        data_hora = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M")
        filename = f"Report_{data.get('title', 'Score').replace(' ', '_')}_{data_hora}.txt"

        return send_file(
            io.BytesIO(report_content.encode('utf-8')),
            mimetype='text/plain',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/piano_roll', methods=['POST'])
def get_piano_roll_data():
    data = request.json
    file_path = data.get('file_path')

    if not file_path or not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 400

    try:
        score = converter.parse(file_path)
        
        # Expand repeats to ensure accurate timing and duration
        try:
            score = score.expandRepeats()
        except Exception as e:
            print(f"Warning: Could not expand repeats: {e}")
            
        instruments_data = []

        for index, part in enumerate(score.parts):
            part_name = part.partName if part.partName else "Instrument"
            notes_data = []

            # Flatten the part to get all notes/chords in absolute time
            flat_part = part.flatten()

            for element in flat_part.notes:
                offset = float(element.offset)
                duration = float(element.quarterLength)

                if element.isNote:
                    notes_data.append({
                        'pitch': element.pitch.midi,
                        'name': element.pitch.nameWithOctave,
                        'start': offset,
                        'duration': duration,
                        'velocity': element.volume.velocity if element.volume.velocity else 64
                    })
                elif element.isChord:
                    for chord_note in element.notes:
                        notes_data.append({
                            'pitch': chord_note.pitch.midi,
                            'name': chord_note.pitch.nameWithOctave,
                            'start': offset,
                            'duration': duration,
                            'velocity': element.volume.velocity if element.volume.velocity else 64
                        })

            instruments_data.append({
                'index': index,
                'name': part_name,
                'notes': notes_data
            })

        return jsonify({
            'instruments': instruments_data,
            'file_path': file_path
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze_with_ai', methods=['POST'])
def analyze_with_ai():
    data = request.json
    piano_roll_data = data.get('piano_roll_data')
    prompt = data.get('prompt')
    agent_type = data.get('agent_type', 'remote')  # 'local' or 'remote'

    user_config = load_config()
    ai_models_config = load_ai_models_config()
    
    # Determine which API to use based on agent_type
    if agent_type == 'local':
        # Try user config first, fallback to ai_models_config defaults
        api_url = user_config.get('localApiUrl') or ai_models_config.get('local', {}).get('api_url')
        api_key = user_config.get('localApiKey') or ai_models_config.get('local', {}).get('api_key', 'not-needed')
        model = user_config.get('localModel') or ai_models_config.get('local', {}).get('default_model')
    else:  # remote
        # Try user config first, fallback to ai_models_config defaults
        api_url = user_config.get('remoteApiUrl') or ai_models_config.get('remote', {}).get('api_url')
        api_key = user_config.get('remoteApiKey') or ai_models_config.get('remote', {}).get('api_key')
        model = user_config.get('remoteModel') or ai_models_config.get('remote', {}).get('default_model')
    
    # Validate configuration
    if not api_url or not model:
        return jsonify({'error': f'AI configuration ({agent_type}) incomplete. Check Advanced Options or config/ai_models.json.'}), 400
    
    try:
        # Create OpenAI client with the configured settings
        client = OpenAI(api_key=api_key, base_url=api_url)
        
        # Build the message with piano roll data and prompt
        if piano_roll_data:
            instrument_names = ", ".join([inst.get('name', 'Unknown') for inst in piano_roll_data])
        else:
            instrument_names = 'Unknown'
            
        notes_json = json.dumps(piano_roll_data, indent=2)
        
        # Get analysis settings from ai_models_config
        analysis_settings = ai_models_config.get('analysis_settings', {})
        temperature = analysis_settings.get('temperature', 0.7)
        max_tokens = analysis_settings.get('max_tokens', 2000)
        
        full_prompt = f"""Instruments: {instrument_names}

Piano Roll Data (JSON):
{notes_json}

Analysis Prompt:
{prompt}

Please provide a detailed and structured analysis in Markdown."""
        
        # Call the AI API
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a music analysis expert. Provide detailed and well-structured analyses in Markdown format."},
                {"role": "user", "content": full_prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        analysis_result = response.choices[0].message.content
        return jsonify({'analysis_result': analysis_result})
        
    except Exception as e:
        return jsonify({'error': f'Error in AI analysis: {str(e)}'}), 500


@app.route('/comparison_data', methods=['POST'])
def get_comparison_data():
    """Get note data for multiple instruments for comparison"""
    try:
        data = request.json
        file_path = data.get('file_path')
        instrument_indices = data.get('instrument_indices', [])
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 400
        
        # Parse the score
        score = converter.parse(file_path)
        
        # Expand repeats to ensure accurate timing and duration
        try:
            score = score.expandRepeats()
        except Exception as e:
            print(f"Warning: Could not expand repeats: {e}")
        
        # Get measure duration
        time_sig = score.flatten().getElementsByClass(meter.TimeSignature)
        measure_duration_beats = time_sig[0].beatCount if time_sig else 4
        
        # Get all parts
        parts = score.parts
        
        result_instruments = []
        
        # Extract notes from selected instruments
        for idx in instrument_indices:
            if idx < len(parts):
                part = parts[idx]
                instrument_name = part.partName or f"Instrument {idx + 1}"
                
                notes_data = []
                # Use flatten().notes to get all notes/chords with absolute offsets
                for element in part.flatten().notes:
                    offset = float(element.offset)
                    duration = float(element.quarterLength)
                    
                    if isinstance(element, note.Note):
                        notes_data.append({
                            'pitch': element.pitch.midi,
                            'start_time': offset,
                            'duration': duration,
                            'name': element.pitch.nameWithOctave
                        })
                    elif isinstance(element, chord.Chord):
                        for n in element.notes:
                            notes_data.append({
                                'pitch': n.pitch.midi,
                                'start_time': offset,
                                'duration': duration,
                                'name': n.pitch.nameWithOctave
                            })
                
                result_instruments.append({
                    'index': idx,
                    'name': instrument_name,
                    'notes': notes_data
                })
        
        return jsonify({
            'instruments': result_instruments,
            'measure_duration_beats': measure_duration_beats,
            'file_path': file_path
        })
        
    except Exception as e:
        print(f"Error in comparison_data: {e}")
        return jsonify({'error': f'Error processing comparison data: {str(e)}'}), 500


@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    """Handle chat messages with the AI"""
    try:
        data = request.json
        message = data.get('message')
        agent_type = data.get('agent_type', 'remote')
        
        if not message:
            return jsonify({'error': 'Empty message'}), 400
            
        # Load configurations
        user_config = load_config()
        ai_models_config = load_ai_models_config()
        
        # Determine which API to use based on agent_type
        if agent_type == 'local':
            api_url = user_config.get('localApiUrl') or ai_models_config.get('local', {}).get('api_url')
            api_key = user_config.get('localApiKey') or ai_models_config.get('local', {}).get('api_key', 'not-needed')
            model = user_config.get('localModel') or ai_models_config.get('local', {}).get('default_model')
        else:  # remote
            api_url = user_config.get('remoteApiUrl') or ai_models_config.get('remote', {}).get('api_url')
            api_key = user_config.get('remoteApiKey') or ai_models_config.get('remote', {}).get('api_key')
            model = user_config.get('remoteModel') or ai_models_config.get('remote', {}).get('default_model')
        
        # Validate configuration
        if not api_url or not model:
            return jsonify({'error': f'AI configuration ({agent_type}) incomplete. Check Advanced Options or config/ai_models.json.'}), 400
            
        client = OpenAI(api_key=api_key, base_url=api_url)
        
        # System prompt for the chatbot
        system_prompt = """You are a musical assistant specialized in music theory and analysis.
        Your goal is to help the user understand the musical analysis that has just been done or answer general questions about music.
        Be concise, helpful, and polite. Always answer in English."""
        
        # Get analysis settings from ai_models_config
        analysis_settings = ai_models_config.get('analysis_settings', {})
        temperature = analysis_settings.get('temperature', 0.7)
        max_tokens = analysis_settings.get('max_tokens', 2000)
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        ai_response = response.choices[0].message.content
        
        return jsonify({'response': ai_response})
        
    except Exception as e:
        print(f"Chat Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/detect-tonality', methods=['POST'])
def detect_tonality():
    """Detect the tonality of a score"""
    try:
        data = request.json
        file_path = data.get('file_path')

        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 400

        score = converter.parse(file_path)
        key_sig = score.analyze('key')

        if key_sig:
            return jsonify({
                'tonality_detected': True,
                'tonality': str(key_sig.tonic),
                'mode': key_sig.mode,  # 'major' ou 'minor'
                'tonic_pitch_class': key_sig.tonic.pitchClass
            })
        else:
            return jsonify({
                'tonality_detected': False,
                'message': 'Nenhuma tonalidade clara detectada'
            })
    except Exception as e:
        print(f"Tonality detection error: {e}")
        return jsonify({'error': str(e)}), 400

@app.route('/api/advanced-analysis', methods=['POST'])
def advanced_analysis():
    """Advanced musical analysis endpoint with environment awareness"""
    try:
        data = request.json
        file_path = data.get('file_path')
        analysis_type = data.get('analysis_type', '')
        part_index = data.get('part_index', 0)
        environment = data.get('environment', 'tonal')  # Default: tonal

        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 400

        score = converter.parse(file_path)
        result = {}

        if analysis_type == 'cadences':
            result = analyze_cadences_advanced(score)
        elif analysis_type == 'modulation':
            result = analyze_modulation(score)
        elif analysis_type == 'voice_leading':
            result = analyze_voice_leading(score)
        elif analysis_type == 'dissonance':
            result = analyze_dissonance(score)
        elif analysis_type == 'harmonic_functions':
            result = analyze_harmonic_functions_advanced(score)
        elif analysis_type == 'phrase_structure':
            result = analyze_phrase_structure(score)
        elif analysis_type == 'texture_advanced':
            result = analyze_texture_advanced(score)
        elif analysis_type == 'chromatic_analysis':
            result = analyze_chromatic_advanced(score)
        elif analysis_type == 'symmetry':
            # Use environment-aware analysis
            if environment == 'serial':
                result = analyze_symmetry_music21(score, part_index)
            else:
                result = analyze_symmetry_tonal(score, part_index)
        elif analysis_type == 'symmetry_music21':
            result = analyze_symmetry_music21(score, part_index)
        elif analysis_type == 'statistics':
            result = analyze_complete_statistics(score)
        else:
            return jsonify({'error': 'Unknown analysis type'}), 400

        return jsonify(result)

    except Exception as e:
        print(f"Advanced analysis error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/get-parts', methods=['POST'])
def get_parts():
    """Get list of parts/instruments from the score"""
    try:
        data = request.json
        file_path = data.get('file_path')

        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 400

        score = converter.parse(file_path)
        parts_info = []

        for idx, part in enumerate(score.parts):
            part_name = part.partName or f"Part {idx + 1}"
            instrument_name = part.getInstrument().instrumentName if part.getInstrument() else "Unknown"
            notes_count = len([n for n in part.recurse().notes if isinstance(n, note.Note)])

            parts_info.append({
                'index': idx,
                'name': part_name,
                'instrument': instrument_name,
                'notes_count': notes_count
            })

        return jsonify({'parts': parts_info})

    except Exception as e:
        print(f"Get parts error: {e}")
        return jsonify({'error': str(e)}), 500

def analyze_cadences_advanced(score):
    """Detect musical cadences using music21's cadence detector"""
    try:
        cadences_found = []

        for part_idx, part in enumerate(score.parts):
            measures = part.getElementsByClass('Measure')

            # Get the overall key
            try:
                key_obj = score.analyze('key')
            except:
                key_obj = None

            # Look for cadences in the last measures
            for i in range(max(0, len(measures) - 8), len(measures)):
                measure = measures[i]
                try:
                    chords = measure.chordify()

                    # Check for authentic cadence (V-I)
                    if i > 0:
                        prev_measure = measures[i - 1]
                        prev_chords = prev_measure.chordify()

                        current_bass = chords.notes[0].pitch.pitchClass if chords.notes else None
                        prev_bass = prev_chords.notes[0].pitch.pitchClass if prev_chords.notes else None

                        if current_bass is not None and prev_bass is not None:
                            # V to I pattern (7 to 0 in pitch class)
                            if prev_bass == 7 and current_bass == 0:
                                cadences_found.append({
                                    'measure': i + 1,
                                    'type': 'Authentic (V-I)',
                                    'strength': 0.95,
                                    'instrument': part.partName or f'Part {part_idx + 1}'
                                })
                            # IV to I pattern (5 to 0)
                            elif prev_bass == 5 and current_bass == 0:
                                cadences_found.append({
                                    'measure': i + 1,
                                    'type': 'Plagal (IV-I)',
                                    'strength': 0.80,
                                    'instrument': part.partName or f'Part {part_idx + 1}'
                                })
                except:
                    pass

        return {
            'cadences': cadences_found,
            'total_cadences': len(cadences_found),
            'summary': f'Found {len(cadences_found)} cadences in score'
        }
    except Exception as e:
        return {'error': f'Cadence detection failed: {str(e)}', 'cadences': []}

def analyze_modulation(score):
    """Detect key modulations throughout the score"""
    try:
        modulations = []
        local_keys = []

        # Analyze key changes by section
        parts = score.parts
        if not parts:
            return {'error': 'No parts found', 'modulations': []}

        first_part = parts[0]
        measures = first_part.getElementsByClass('Measure')

        # Analyze every 4 measures for key changes
        window_size = 4
        for i in range(0, len(measures) - window_size, window_size):
            section = stream.Score()
            for j in range(i, min(i + window_size, len(measures))):
                section.append(measures[j])

            try:
                key_obj = section.analyze('key')
                local_keys.append({
                    'measure': i + 1,
                    'key': f"{key_obj.tonic.name} {key_obj.mode}",
                    'confidence': 0.7
                })
            except:
                pass

        # Check for modulations (key changes)
        for i in range(1, len(local_keys)):
            if local_keys[i]['key'] != local_keys[i-1]['key']:
                modulations.append({
                    'from_measure': local_keys[i-1]['measure'],
                    'to_measure': local_keys[i]['measure'],
                    'from_key': local_keys[i-1]['key'],
                    'to_key': local_keys[i]['key']
                })

        return {
            'local_keys': local_keys,
            'modulations': modulations,
            'total_modulations': len(modulations),
            'summary': f'Found {len(modulations)} key modulations'
        }
    except Exception as e:
        return {'error': f'Modulation analysis failed: {str(e)}', 'modulations': []}

def analyze_voice_leading(score):
    """Analyze voice leading patterns and movements"""
    try:
        voice_leading_data = []

        for part_idx, part in enumerate(score.parts):
            notes_list = [n for n in part.recurse().notes if isinstance(n, note.Note)]

            if len(notes_list) < 2:
                continue

            voice_info = {
                'instrument': part.partName or f'Part {part_idx + 1}',
                'total_notes': len(notes_list),
                'leaps': 0,
                'average_leap': 0,
                'stepwise_motion': 0,
                'pitch_range': None
            }

            leap_intervals = []
            stepwise = 0

            for i in range(1, len(notes_list)):
                intv = interval.Interval(notes_list[i - 1], notes_list[i])
                semitones = abs(intv.semitones)

                if semitones > 2:  # Leap = more than 2 semitones
                    voice_info['leaps'] += 1
                    leap_intervals.append(semitones)
                else:
                    stepwise += 1

            voice_info['stepwise_motion'] = stepwise

            if leap_intervals:
                voice_info['average_leap'] = round(sum(leap_intervals) / len(leap_intervals), 2)

            pitches = [n.pitch.midi for n in notes_list]
            voice_info['pitch_range'] = f"{min(pitches)} - {max(pitches)} MIDI"

            voice_leading_data.append(voice_info)

        return {
            'voice_analysis': voice_leading_data,
            'summary': f'Analyzed {len(voice_leading_data)} voices'
        }
    except Exception as e:
        return {'error': f'Voice leading analysis failed: {str(e)}', 'voice_analysis': []}

def analyze_dissonance(score):
    """Analyze dissonance and consonance patterns"""
    try:
        dissonance_data = {
            'dissonant_intervals': [],
            'consonant_intervals': [],
            'dissonance_moments': [],
            'dissonance_percentage': 0
        }

        dissonant_semitones = [1, 2, 6, 10, 11]  # Minor 2nd, Major 2nd, Tritone, etc.
        consonant_semitones = [0, 3, 4, 5, 7, 8, 9, 12]  # Unison, 3rd, 4th, 5th, etc.

        total_intervals = 0
        dissonant_count = 0

        for part_idx, part in enumerate(score.parts):
            notes_list = [n for n in part.recurse().notes if isinstance(n, note.Note)]

            for i in range(1, len(notes_list)):
                intv = interval.Interval(notes_list[i - 1], notes_list[i])
                semitones = intv.semitones % 12
                total_intervals += 1

                if semitones in dissonant_semitones:
                    dissonant_count += 1
                    dissonance_data['dissonant_intervals'].append({
                        'from': str(notes_list[i - 1].pitch),
                        'to': str(notes_list[i].pitch),
                        'interval': intv.name,
                        'instrument': part.partName or f'Part {part_idx + 1}'
                    })
                else:
                    dissonance_data['consonant_intervals'].append(intv.name)

        if total_intervals > 0:
            dissonance_data['dissonance_percentage'] = round((dissonant_count / total_intervals) * 100, 2)

        return {
            'dissonance': dissonance_data,
            'total_intervals_analyzed': total_intervals,
            'summary': f'{dissonance_data["dissonance_percentage"]}% dissonance detected'
        }
    except Exception as e:
        return {'error': f'Dissonance analysis failed: {str(e)}', 'dissonance': {}}

def analyze_harmonic_functions_advanced(score):
    """Analyze advanced harmonic functions (7ths, tensions, extensions)"""
    try:
        harmonic_data = {
            'triads': 0,
            'seventh_chords': 0,
            'extended_chords': 0,
            'altered_chords': 0,
            'chord_breakdown': {}
        }

        try:
            key_obj = score.analyze('key')
        except:
            key_obj = None

        for part in score.parts:
            measures = part.getElementsByClass('Measure')

            for measure in measures:
                chords = measure.chordify()

                for c in chords.flatten().getElementsByClass('Chord'):
                    if c.isRest:
                        continue

                    pitches = len(c.pitches)

                    # Classify chord type
                    if pitches == 3:
                        harmonic_data['triads'] += 1
                    elif pitches == 4:
                        harmonic_data['seventh_chords'] += 1
                    else:
                        harmonic_data['extended_chords'] += 1

                    try:
                        chord_name = c.pitchedCommonName
                        harmonic_data['chord_breakdown'][chord_name] = harmonic_data['chord_breakdown'].get(chord_name, 0) + 1
                    except:
                        pass

        return {
            'harmonic_functions': harmonic_data,
            'summary': f'Triads: {harmonic_data["triads"]}, Sevenths: {harmonic_data["seventh_chords"]}, Extended: {harmonic_data["extended_chords"]}'
        }
    except Exception as e:
        return {'error': f'Harmonic functions analysis failed: {str(e)}', 'harmonic_functions': {}}

def analyze_phrase_structure(score):
    """Analyze phrase structure and boundaries"""
    try:
        phrases = []

        for part_idx, part in enumerate(score.parts):
            measures = part.getElementsByClass('Measure')
            current_phrase_start = 1

            # Simple heuristic: new phrase every 4 measures or at rests
            for i, measure in enumerate(measures):
                notes = measure.notes

                # Check for long rest or measure boundary
                if i > 0 and i % 4 == 0:
                    phrases.append({
                        'instrument': part.partName or f'Part {part_idx + 1}',
                        'start_measure': current_phrase_start,
                        'end_measure': i + 1,
                        'length': i - current_phrase_start + 2
                    })
                    current_phrase_start = i + 2

            # Add final phrase
            if current_phrase_start <= len(measures):
                phrases.append({
                    'instrument': part.partName or f'Part {part_idx + 1}',
                    'start_measure': current_phrase_start,
                    'end_measure': len(measures),
                    'length': len(measures) - current_phrase_start + 1
                })

        return {
            'phrases': phrases,
            'total_phrases': len(phrases),
            'summary': f'Identified {len(phrases)} phrases'
        }
    except Exception as e:
        return {'error': f'Phrase structure analysis failed: {str(e)}', 'phrases': []}

def analyze_texture_advanced(score):
    """Advanced texture analysis including density and sonority"""
    try:
        texture_data = {
            'sections': [],
            'average_note_density': 0,
            'harmonic_rhythm': []
        }

        measures = score.parts[0].getElementsByClass('Measure') if score.parts else []
        total_notes_per_measure = []

        for i, measure in enumerate(measures):
            note_count = len(measure.flatten().notes)
            total_notes_per_measure.append(note_count)

            # Classify texture density
            if note_count < 5:
                density = 'Sparse'
            elif note_count < 10:
                density = 'Moderate'
            else:
                density = 'Dense'

            texture_data['harmonic_rhythm'].append({
                'measure': i + 1,
                'note_count': note_count,
                'density': density
            })

        if total_notes_per_measure:
            texture_data['average_note_density'] = round(sum(total_notes_per_measure) / len(total_notes_per_measure), 2)

        return {
            'texture': texture_data,
            'summary': f'Average density: {texture_data["average_note_density"]} notes/measure'
        }
    except Exception as e:
        return {'error': f'Texture analysis failed: {str(e)}', 'texture': {}}

def analyze_chromatic_advanced(score):
    """Advanced chromatic analysis including accidentals and chromatic motion"""
    try:
        chromatic_data = {
            'chromatic_notes': 0,
            'accidentals': {},
            'chromatic_passages': [],
            'diatonic_percentage': 0
        }

        try:
            key_obj = score.analyze('key')
            diatonic_pitches = [p.pitchClass for p in key_obj.getPitches()]
        except:
            diatonic_pitches = [0, 2, 4, 5, 7, 9, 11]  # Default C major

        total_notes = 0
        chromatic_count = 0

        for part in score.parts:
            notes_list = [n for n in part.recurse().notes if isinstance(n, note.Note)]

            for n in notes_list:
                total_notes += 1
                pitch_class = n.pitch.pitchClass

                if pitch_class not in diatonic_pitches:
                    chromatic_count += 1
                    accidental = str(n.pitch.accidental) if n.pitch.accidental else 'natural'
                    chromatic_data['accidentals'][accidental] = chromatic_data['accidentals'].get(accidental, 0) + 1

        chromatic_data['chromatic_notes'] = chromatic_count

        if total_notes > 0:
            chromatic_data['diatonic_percentage'] = round(((total_notes - chromatic_count) / total_notes) * 100, 2)

        return {
            'chromaticism': chromatic_data,
            'summary': f'{chromatic_data["diatonic_percentage"]}% diatonic notes'
        }
    except Exception as e:
        return {'error': f'Chromatic analysis failed: {str(e)}', 'chromaticism': {}}

def analyze_symmetry_tonal(score, part_index=0):
    """
    Analyze musical symmetry patterns in TONAL environment

    In tonal music, inversions and transformations are calculated
    with respect to the tonic (key center) of the piece.

    Transformations:
    - Retrograde: Reverse of pitch-class sequence
    - Inversion: Mirror around the tonic pitch
    - Retrograde-Inversion: Retrograde + Inversion
    """
    try:
        # 1. OBTER TONALIDADE
        key_sig = score.analyze('key')
        if key_sig:
            tonic_pc = key_sig.tonic.pitchClass
            tonality_name = str(key_sig.tonic)
            mode = key_sig.mode
        else:
            tonic_pc = 0  # Default: C
            tonality_name = "C"
            mode = "unknown"

        # 2. VALIDAR PARTES
        if not score.parts:
            return {'error': 'No parts found', 'symmetry': {}}

        if part_index >= len(score.parts):
            return {'error': f'Part index {part_index} out of range', 'symmetry': {}}

        # 3. EXTRAIR NOTAS
        target_part = score.parts[part_index]
        part_name = target_part.partName or f"Part {part_index + 1}"
        notes_list = [n for n in target_part.recurse().notes if isinstance(n, note.Note)]

        if len(notes_list) < 4:
            return {
                'symmetry': {
                    'retrograde_score': 0,
                    'inversion_score': 0,
                    'retrograde_inversion_score': 0,
                    'method': 'tonal',
                    'tonality': tonality_name,
                    'tonic_pitch_class': tonic_pc,
                    'mode': mode
                },
                'part_name': part_name,
                'summary': f'{part_name}: Too short for symmetry analysis'
            }

        pitch_sequence = [n.pitch.pitchClass for n in notes_list]

        # 4. CÁLCULO DE RETROGRADO
        # Fórmula: reversed_sequence
        reversed_sequence = pitch_sequence[::-1]
        retrograde_matches = sum(1 for i in range(len(pitch_sequence))
                                if pitch_sequence[i] == reversed_sequence[i])
        retrograde_score = (retrograde_matches / len(pitch_sequence)) * 100 if pitch_sequence else 0
        retrograde_measures = [notes_list[i].measureNumber for i in range(len(pitch_sequence))
                              if notes_list[i].measureNumber and
                              pitch_sequence[i] == reversed_sequence[i]]

        # 5. CÁLCULO DE INVERSÃO (COM EIXO NA TÓNICA)
        # Fórmula: inverted = (2 * tonic - pitch) % 12
        inverted_sequence = [(2 * tonic_pc - p) % 12 for p in pitch_sequence]
        inversion_matches = sum(1 for i in range(len(pitch_sequence))
                               if pitch_sequence[i] == inverted_sequence[i])
        inversion_score = (inversion_matches / len(pitch_sequence)) * 100 if pitch_sequence else 0
        inversion_measures = [notes_list[i].measureNumber for i in range(len(pitch_sequence))
                             if notes_list[i].measureNumber and
                             pitch_sequence[i] == inverted_sequence[i]]

        # 6. CÁLCULO DE RETROGRADE-INVERSION
        # Aplicar inversão primeiro, depois retrograde
        ri_sequence = [(2 * tonic_pc - p) % 12 for p in pitch_sequence[::-1]]
        ri_matches = sum(1 for i in range(len(pitch_sequence))
                        if pitch_sequence[i] == ri_sequence[i])
        ri_score = (ri_matches / len(pitch_sequence)) * 100 if pitch_sequence else 0
        ri_measures = [notes_list[i].measureNumber for i in range(len(pitch_sequence))
                      if notes_list[i].measureNumber and
                      pitch_sequence[i] == ri_sequence[i]]

        # 7. RETORNAR RESULTADO
        return {
            'symmetry': {
                'retrograde_score': round(retrograde_score, 2),
                'inversion_score': round(inversion_score, 2),
                'retrograde_inversion_score': round(ri_score, 2),
                'retrograde_measures': list(set(retrograde_measures)),
                'inversion_measures': list(set(inversion_measures)),
                'ri_measures': list(set(ri_measures)),
                'method': 'tonal',
                'tonality': tonality_name,
                'tonic_pitch_class': tonic_pc,
                'mode': mode
            },
            'part_name': part_name,
            'summary': f'Análise Tonal em {tonality_name} {mode.capitalize()}: R={retrograde_score:.1f}%, I={inversion_score:.1f}%, RI={ri_score:.1f}%'
        }
    except Exception as e:
        return {'error': f'Tonal symmetry analysis failed: {str(e)}', 'symmetry': {}}

def analyze_symmetry_advanced(score, part_index=0):
    """Analyze musical symmetry patterns (retrograde, inversion)"""
    try:
        symmetry_data = {
            'retrograde_score': 0,
            'inversion_score': 0,
            'retrograde_measures': [],
            'inversion_measures': [],
            'mirror_sections': []
        }

        if not score.parts:
            return {'error': 'No parts found', 'symmetry': symmetry_data}

        if part_index >= len(score.parts):
            return {'error': f'Part index {part_index} out of range', 'symmetry': symmetry_data}

        target_part = score.parts[part_index]
        part_name = target_part.partName or f"Part {part_index + 1}"
        notes_list = [n for n in target_part.recurse().notes if isinstance(n, note.Note)]

        if len(notes_list) < 4:
            return {'symmetry': symmetry_data, 'summary': f'{part_name}: Too short for symmetry analysis'}

        # Get pitch sequence
        pitch_sequence = [n.pitch.pitchClass for n in notes_list]

        # Check retrograde similarity (reversed sequence)
        reversed_sequence = pitch_sequence[::-1]
        retrograde_measures = []
        retrograde_matches = 0
        for i in range(len(pitch_sequence)):
            if pitch_sequence[i] == reversed_sequence[i]:
                retrograde_matches += 1
                measure_num = notes_list[i].measureNumber
                if measure_num and measure_num not in retrograde_measures:
                    retrograde_measures.append(measure_num)
        symmetry_data['retrograde_score'] = round((retrograde_matches / len(pitch_sequence)) * 100, 2)
        symmetry_data['retrograde_measures'] = sorted(retrograde_measures)

        # Check inversion similarity
        inverted_sequence = [(12 - p) % 12 for p in pitch_sequence]
        inversion_measures = []
        inversion_matches = 0
        for i in range(len(pitch_sequence)):
            if pitch_sequence[i] == inverted_sequence[i]:
                inversion_matches += 1
                measure_num = notes_list[i].measureNumber
                if measure_num and measure_num not in inversion_measures:
                    inversion_measures.append(measure_num)
        symmetry_data['inversion_score'] = round((inversion_matches / len(pitch_sequence)) * 100, 2)
        symmetry_data['inversion_measures'] = sorted(inversion_measures)

        return {
            'symmetry': symmetry_data,
            'part_name': part_name,
            'summary': f'{part_name} - Retrograde: {symmetry_data["retrograde_score"]}%, Inversion: {symmetry_data["inversion_score"]}%'
        }
    except Exception as e:
        return {'error': f'Symmetry analysis failed: {str(e)}', 'symmetry': {}}

def analyze_symmetry_music21(score, part_index=0):
    """Analyze musical symmetry patterns using music21 native methods"""
    try:
        from music21 import serial

        symmetry_data = {
            'retrograde_score': 0,
            'inversion_score': 0,
            'retrograde_inversion_score': 0,
            'retrograde_measures': [],
            'inversion_measures': [],
            'ri_measures': [],
            'method': 'music21'
        }

        if not score.parts:
            return {'error': 'No parts found', 'symmetry': symmetry_data}

        if part_index >= len(score.parts):
            return {'error': f'Part index {part_index} out of range', 'symmetry': symmetry_data}

        target_part = score.parts[part_index]
        part_name = target_part.partName or f"Part {part_index + 1}"
        notes_list = [n for n in target_part.recurse().notes if isinstance(n, note.Note)]

        if len(notes_list) < 4:
            return {'symmetry': symmetry_data, 'part_name': part_name, 'summary': f'{part_name}: Too short for symmetry analysis'}

        pitch_sequence = [n.pitch.pitchClass for n in notes_list]

        row_length = min(12, len(pitch_sequence))
        original_series = serial.pcToToneRow(pitch_sequence[:row_length])

        retrograde_series = original_series.zeroCenteredTransformation('R', 0)
        retrograde_pitches = retrograde_series.pitchClasses()
        retrograde_measures = []
        retrograde_matches = 0
        for i in range(len(pitch_sequence)):
            if pitch_sequence[i] == retrograde_pitches[i % len(retrograde_pitches)]:
                retrograde_matches += 1
                measure_num = notes_list[i].measureNumber
                if measure_num and measure_num not in retrograde_measures:
                    retrograde_measures.append(measure_num)
        symmetry_data['retrograde_score'] = round((retrograde_matches / len(pitch_sequence)) * 100, 2)
        symmetry_data['retrograde_measures'] = sorted(retrograde_measures)

        inversion_series = original_series.zeroCenteredTransformation('I', 0)
        inversion_pitches = inversion_series.pitchClasses()
        inversion_measures = []
        inversion_matches = 0
        for i in range(len(pitch_sequence)):
            if pitch_sequence[i] == inversion_pitches[i % len(inversion_pitches)]:
                inversion_matches += 1
                measure_num = notes_list[i].measureNumber
                if measure_num and measure_num not in inversion_measures:
                    inversion_measures.append(measure_num)
        symmetry_data['inversion_score'] = round((inversion_matches / len(pitch_sequence)) * 100, 2)
        symmetry_data['inversion_measures'] = sorted(inversion_measures)

        retrograde_inversion_series = original_series.zeroCenteredTransformation('RI', 0)
        ri_pitches = retrograde_inversion_series.pitchClasses()
        ri_measures = []
        ri_matches = 0
        for i in range(len(pitch_sequence)):
            if pitch_sequence[i] == ri_pitches[i % len(ri_pitches)]:
                ri_matches += 1
                measure_num = notes_list[i].measureNumber
                if measure_num and measure_num not in ri_measures:
                    ri_measures.append(measure_num)
        symmetry_data['retrograde_inversion_score'] = round((ri_matches / len(pitch_sequence)) * 100, 2)
        symmetry_data['ri_measures'] = sorted(ri_measures)

        return {
            'symmetry': symmetry_data,
            'part_name': part_name,
            'summary': f'{part_name} (Music21) - Retrograde: {symmetry_data["retrograde_score"]}%, Inversion: {symmetry_data["inversion_score"]}%, RI: {symmetry_data["retrograde_inversion_score"]}%'
        }
    except Exception as e:
        return {'error': f'Music21 symmetry analysis failed: {str(e)}', 'symmetry': {}}

def analyze_complete_statistics(score):
    """Complete statistical summary of the score"""
    try:
        stats = {
            'total_notes': 0,
            'unique_pitches': set(),
            'average_duration': 0,
            'total_measures': 0,
            'parts_count': len(score.parts),
            'average_notes_per_measure': 0,
            'pitch_distribution': {}
        }

        total_duration = 0

        for part in score.parts:
            notes_list = [n for n in part.recurse().notes if isinstance(n, note.Note)]

            for n in notes_list:
                stats['total_notes'] += 1
                stats['unique_pitches'].add(n.pitch.pitchClass)
                total_duration += n.quarterLength

                pitch_name = n.pitch.name
                stats['pitch_distribution'][pitch_name] = stats['pitch_distribution'].get(pitch_name, 0) + 1

        stats['unique_pitches'] = len(stats['unique_pitches'])

        if score.parts and score.parts[0].getElementsByClass('Measure'):
            stats['total_measures'] = len(score.parts[0].getElementsByClass('Measure'))

        if stats['total_notes'] > 0:
            stats['average_duration'] = round(total_duration / stats['total_notes'], 2)
            if stats['total_measures'] > 0:
                stats['average_notes_per_measure'] = round(stats['total_notes'] / stats['total_measures'], 2)

        return {
            'statistics': stats,
            'summary': f'Total: {stats["total_notes"]} notes, {stats["unique_pitches"]} unique pitches, {stats["total_measures"]} measures'
        }
    except Exception as e:
        return {'error': f'Statistics analysis failed: {str(e)}', 'statistics': {}}


@app.route('/get_instrument_musicxml', methods=['POST'])
def get_instrument_musicxml():
    """
    Export MusicXML for a specific instrument from the loaded score.
    Request body: {file_path: str, instrument_index: int, start_measure: int, end_measure: int}
    Returns: MusicXML string
    """
    try:
        data = request.get_json()
        file_path = data.get('file_path')
        instrument_index = data.get('instrument_index', 0)
        start_measure = data.get('start_measure', 1)
        end_measure = data.get('end_measure', None)

        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'Invalid file path'}), 400

        # Load score
        score = converter.parse(file_path)

        # Get all parts
        parts = score.parts
        if instrument_index >= len(parts):
            return jsonify({'error': f'Instrument index {instrument_index} out of range'}), 400

        # Extract specific part
        part = parts[instrument_index]

        # Filter by measure range if specified
        if end_measure:
            # Create a new stream with only selected measures
            new_part = stream.Part()
            new_part.id = part.id
            new_part.partName = part.partName

            # Copy metadata
            for elem in part.flatten():
                if isinstance(elem, (clef.Clef, key.KeySignature, meter.TimeSignature)):
                    new_part.insert(0, elem)
                    break

            # Extract measures in range
            measures = part.getElementsByClass('Measure')
            for m in measures:
                if hasattr(m, 'number') and start_measure <= m.number <= end_measure:
                    new_part.append(m)

            part = new_part

        # Export to MusicXML string
        # Create temporary file, write MusicXML, read it back, then delete
        temp_xml = tempfile.NamedTemporaryFile(mode='w', suffix='.musicxml', delete=False, encoding='utf-8')
        temp_xml_path = temp_xml.name
        temp_xml.close()

        try:
            part.write('musicxml', fp=temp_xml_path)
            with open(temp_xml_path, 'r', encoding='utf-8') as f:
                musicxml_string = f.read()
            os.remove(temp_xml_path)
        except Exception as e:
            if os.path.exists(temp_xml_path):
                os.remove(temp_xml_path)
            raise e

        return jsonify({
            'musicxml': musicxml_string,
            'instrument_name': part.partName or f'Instrument {instrument_index}',
            'measures': f'{start_measure}-{end_measure or "end"}'
        })

    except Exception as e:
        print(f"Error exporting MusicXML: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/get_combined_musicxml', methods=['POST'])
def get_combined_musicxml():
    """
    Export combined MusicXML for multiple instruments from the loaded score.
    Request body: {file_path: str, instrument_indices: [int], start_measure: int, end_measure: int}
    Returns: Combined MusicXML string with all selected instruments
    """
    try:
        data = request.get_json()
        file_path = data.get('file_path')
        instrument_indices = data.get('instrument_indices', [])
        start_measure = data.get('start_measure', 1)
        end_measure = data.get('end_measure', None)

        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'Invalid file path'}), 400

        if not instrument_indices or len(instrument_indices) == 0:
            return jsonify({'error': 'No instruments selected'}), 400

        # Load score
        score = converter.parse(file_path)

        # Get all parts
        all_parts = score.parts

        # Validate instrument indices
        for idx in instrument_indices:
            if idx >= len(all_parts):
                return jsonify({'error': f'Instrument index {idx} out of range'}), 400

        # Create a new score with selected instruments
        combined_score = stream.Score()

        # Copy metadata from original score
        for elem in score.flatten():
            if isinstance(elem, (meter.TimeSignature, key.KeySignature)):
                combined_score.insert(0, elem)
                break

        # Add each selected instrument
        instrument_names = []
        for idx in instrument_indices:
            part = all_parts[idx]
            instrument_names.append(part.partName or f'Instrument {idx}')

            # Filter by measure range if specified
            if end_measure:
                # Create a new part with only selected measures
                new_part = stream.Part()
                new_part.id = part.id
                new_part.partName = part.partName

                # Copy clef, key signature, time signature
                for elem in part.flatten():
                    if isinstance(elem, (clef.Clef, key.KeySignature, meter.TimeSignature)):
                        new_part.insert(0, elem)
                        break

                # Extract measures in range
                measures = part.getElementsByClass('Measure')
                for m in measures:
                    if hasattr(m, 'number') and start_measure <= m.number <= end_measure:
                        new_part.append(m)

                combined_score.insert(0, new_part)
            else:
                combined_score.insert(0, part)

        # Export to MusicXML string
        temp_xml = tempfile.NamedTemporaryFile(mode='w', suffix='.musicxml', delete=False, encoding='utf-8')
        temp_xml_path = temp_xml.name
        temp_xml.close()

        try:
            combined_score.write('musicxml', fp=temp_xml_path)
            with open(temp_xml_path, 'r', encoding='utf-8') as f:
                musicxml_string = f.read()
            os.remove(temp_xml_path)
        except Exception as e:
            if os.path.exists(temp_xml_path):
                os.remove(temp_xml_path)
            raise e

        return jsonify({
            'musicxml': musicxml_string,
            'instrument_names': instrument_names,
            'instrument_count': len(instrument_indices),
            'measures': f'{start_measure}-{end_measure or "end"}'
        })

    except Exception as e:
        print(f"Error exporting combined MusicXML: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)