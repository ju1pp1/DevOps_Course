from flask import Flask, request, Response
import os

app = Flask(__name__)

LOG_DIR = "/data"
LOG_FILE = os.path.join(LOG_DIR, "storage.log")

os.makedirs(LOG_DIR, exist_ok=True)

@app.post("/log")
def post_log():
    data = request.get_data(as_text=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(data.rstrip("\n") + "\n")
    return "", 204

@app.get("/log")
def get_log():
    if not os.path.exists(LOG_FILE):
        return Response("", mimetype="text/plain")
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    return Response(content, mimetype="text/plain")

@app.get("/")
def root():
    return Response("Storage OK. POST/GET /log", mimetype="text/plain")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)