import os
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

from flask import Flask, redirect, request, session, url_for, render_template
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import os
import json

app = Flask(__name__)
app.secret_key = "YOUR_SECRET_KEY"  # Change this in production

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email"
]
CLIENT_SECRET_FILE = 'client_secret.json'
TOKEN_FILE = 'token.json'


@app.route("/")
def index():
    #  Try to load credentials from token.json
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        if creds and creds.valid:
            return render_template("logs.html")  # Replace with your dashboard
        elif creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_FILE, "w") as token:
                token.write(creds.to_json())
            return render_template("logs.html")
    
    # Fallback to session if token.json is missing
    if "credentials" in session:
        creds = Credentials(**session["credentials"])
        if creds.valid:
            return render_template("logs.html")

    return redirect("/login")


@app.route("/login")
def login():
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri="http://localhost:5000/callback"
    )
    auth_url, _ = flow.authorization_url(prompt="consent")
    return redirect(auth_url)


@app.route("/callback")
def callback():
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri="http://localhost:5000/callback"
    )
    flow.fetch_token(authorization_response=request.url)

    creds = flow.credentials

    #  Save to session (optional)
    session["credentials"] = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": creds.scopes
    }

    #  Save to file (persistent login)
    with open(TOKEN_FILE, "w") as token:
        token.write(creds.to_json())

    return redirect("/")


@app.route("/logout")
def logout():
    # Clear both session and token
    session.clear()
    if os.path.exists(TOKEN_FILE):
        os.remove(TOKEN_FILE)
    return redirect("/")


if __name__ == "__main__":
    app.run(debug=True)
