"""Isolated browser-test transport. Synthetic inputs only; no external AI requests."""

import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args: object) -> None:
        pass

    def do_POST(self) -> None:
        request = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        prompt = json.loads(request["messages"][-1]["content"][0]["text"])
        fields, sections = [], []
        for page in prompt["pages"]:
            text = page["text"]
            heading = "Invoice" if "Invoice" in text else "BILL OF LADING"
            kind = "INVOICE" if heading == "Invoice" else "B/L"
            if heading in text:
                sections.append({"document_type": kind, "page_from": page["page"], "page_to": page["page"], "heading_quote": heading, "confidence": 0.99})
            for field in prompt["requested_fields"]:
                match = re.search(r"(?:Quantity|Total):\s*([0-9,]+(?:\.[0-9]+)?)", text)
                if field["field"] not in {"invoice_total", "quantity"} or not match:
                    continue
                fields.append({"field": field["field"], "document_type": kind, "page": page["page"], "quote": match[1], "source_offset": match.start(1), "unit": field["unit"], "number_locale": "en", "confidence": 0.99})
        result = {"id": "synthetic-response", "model": "synthetic-test-only", "choices": [{"finish_reason": "stop", "message": {"content": json.dumps({"sections": sections, "fields": fields})}}], "usage": {"prompt_tokens": 1, "completion_tokens": 1}}
        body = json.dumps(result).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


ThreadingHTTPServer(("0.0.0.0", 8001), Handler).serve_forever()
