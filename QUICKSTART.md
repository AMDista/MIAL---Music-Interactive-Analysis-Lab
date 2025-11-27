# 🚀 Quick Start Guide

## Steps to Run the Application

### 1️⃣ Create and Activate Virtual Environment

```bash
# Create venv
python3 -m venv venv

# Activate (macOS/Linux)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate
```

### 2️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

### 3️⃣ Run the Application

```bash
python3 app.py
```

### 4️⃣ Access in Browser

Open: **http://localhost:5000**

---

## 📝 How to Use

1. **Upload**: Select a MusicXML file (.xml or .musicxml)
2. **Configure**: Choose instruments and analysis options
3. **Generate**: Click on "Generate Analysis Report"
4. **Download**: Download the report in .txt format

---

## ⚠️ Common Issues

### Error: "command not found: python"
Use `python3` instead of `python`

### Error: "Address already in use"
Change the port in `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5001)
```

### Error: "ModuleNotFoundError"
Ensure the venv is active and reinstall:
```bash
pip install -r requirements.txt
```

---

## 🛑 Stop the Application

- Press `Ctrl + C` in the terminal
- To deactivate the venv: `deactivate`

---

**Ready! Your application is running! 🎉**