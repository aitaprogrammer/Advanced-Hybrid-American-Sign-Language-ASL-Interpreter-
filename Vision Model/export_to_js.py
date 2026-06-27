import joblib
import m2cgen as m2c

# Load your retrained Random Forest
model = joblib.load('app_style_model.p')

# Export to JavaScript
js_code = m2c.export_to_javascript(model)

# Save to a file
with open('asl_model.js', 'w') as f:
    f.write(js_code)

print("✅ asl_model.js generated – copy this into your React project")