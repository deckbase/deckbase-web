import os
import logging
from flask import Flask, request, jsonify

from analyzer import process_person

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Optional: require a shared secret for production
TRIGGER_SECRET = os.environ.get("SPEECH_ANALYZER_SECRET", "")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Trigger analysis for a person.
    Query param: personId (required)
    Optional header or body: Authorization / X-API-Key for SPEECH_ANALYZER_SECRET
    """
    body = request.get_json(silent=True) or {}
    person_id = request.args.get("personId") or body.get("personId")
    if not person_id or not person_id.strip():
        return jsonify({"error": "personId required"}), 400
    session_id = (request.args.get("sessionId") or body.get("sessionId") or "").strip() or None
    logger.info("[analyzer] /analyze called: person_id=%s session_id=%s", person_id, session_id)

    if TRIGGER_SECRET and request.headers.get("X-API-Key") != TRIGGER_SECRET:
        auth = request.authorization
        if not (auth and auth.password == TRIGGER_SECRET):
            return jsonify({"error": "Unauthorized"}), 401

    person_id = person_id.strip()
    if not session_id:
        logger.warning("[analyzer] session_id missing")
        return jsonify({"error": "sessionId required"}), 400
    try:
        process_person(person_id, session_id=session_id)
        logger.info("[analyzer] process_person completed: person_id=%s session_id=%s", person_id, session_id)
        return jsonify({"status": "done", "personId": person_id, "sessionId": session_id}), 200
    except Exception as e:
        logger.exception("Analysis failed for person_id=%s session_id=%s", person_id, session_id)
        return jsonify({"status": "failed", "personId": person_id, "sessionId": session_id, "error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
