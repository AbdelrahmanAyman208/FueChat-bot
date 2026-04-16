import requests

# Test the chat endpoint
url = "http://localhost:8000/api/v1/chat"
data = {
    "message": "What courses should I take for computer science?",
    "session_id": "test_session"
}

response = requests.post(url, json=data)
print("Status Code:", response.status_code)
print("Response:", response.json())