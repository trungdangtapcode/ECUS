"""Isolated browser-test transport. Synthetic inputs only; no external AI requests."""

import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def semantic_decisions(prompt):
    decisions = []
    aliases = {"BOXES": "BOX", "KGS": "KG", "KGM": "KG", "ĐỒNG": "VND"}
    for field in prompt["fields"]:
        sources = field["sources"]
        keys = {aliases.get(item["value"].upper(), item["value"].upper()) for item in sources}
        same = len(keys) == 1
        company = field["field"] == "company_name"
        address = bool(field.get("address_references"))
        port = bool(field.get("port_references"))
        if "phone" in field["field"]:
            same = len({re.sub(r"\D", "", item["value"]) for item in sources}) == 1
        source = sources[-1]
        decisions.append(
            {
                "field": field["field"],
                "classification": "equivalent"
                if same or company or address or port
                else "different",
                "source_ids": [item["id"] for item in sources],
                "source_observation_id": source["id"]
                if same and not (company or address or port)
                else None,
                "proposed_value": "Example Company, Joint Stock Company"
                if company
                else source["value"]
                if address
                else field["port_references"][0]["canonical_value"]
                if port
                else source["value"]
                if same
                else None,
                "reason": "Synthetic equivalent wording."
                if same or company or address or port
                else "Synthetic sources describe different facts.",
            }
        )
    return {"decisions": decisions}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args: object) -> None:
        pass

    def do_POST(self) -> None:
        request = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        prompt = json.loads(request["messages"][-1]["content"][0]["text"])
        fields, sections = [], []
        for page in prompt.get("pages", []):
            text = page["text"]
            heading = "Invoice" if "Invoice" in text else "BILL OF LADING"
            kind = "INVOICE" if heading == "Invoice" else "B/L"
            if heading in text:
                sections.append(
                    {
                        "document_type": kind,
                        "page_from": page["page"],
                        "page_to": page["page"],
                        "heading_quote": heading,
                        "confidence": 0.99,
                    }
                )
            for field in prompt["requested_fields"]:
                currency_header = "Unit Price (EUR/kg) Amount (EUR)"
                if field["field"] == "invoice_currency" and currency_header in text:
                    # Reproduce a provider's broad, repeated-code context for guard regression.
                    fields.append(
                        dict(
                            field=field["field"],
                            document_type=kind,
                            page=page["page"],
                            quote="EUR",
                            source_offset=None,
                            source_context=currency_header,
                            unit="",
                            number_locale="en",
                            confidence=0.95,
                        )
                    )
                    continue
                if field["field"] == "invoice_incoterm" and "Incoterm: FOB" in text:
                    fields.append(
                        dict(
                            field=field["field"],
                            document_type=kind,
                            page=page["page"],
                            quote="FOB",
                            source_offset=None,
                            source_context="Incoterm: FOB",
                            unit="",
                            number_locale="en",
                            confidence=0.95,
                        )
                    )
                    continue
                match = re.search(r"(?:Quantity|Total):\s*([0-9,]+(?:\.[0-9]+)?)", text)
                if field["field"] not in {"invoice_total", "quantity"} or not match:
                    continue
                fields.append(
                    {
                        "field": field["field"],
                        "document_type": kind,
                        "page": page["page"],
                        "quote": match[1],
                        "source_offset": match.start(1),
                        "unit": field["unit"],
                        "number_locale": "en",
                        "confidence": 0.99,
                    }
                )
        result = {
            "id": "synthetic-response",
            "model": "synthetic-test-only",
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "content": json.dumps(
                            semantic_decisions(prompt)
                            if prompt.get("task") == "reconcile_source_values"
                            else {"sections": sections, "fields": fields}
                        )
                    },
                }
            ],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1},
        }
        body = json.dumps(result).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


ThreadingHTTPServer(("0.0.0.0", 8001), Handler).serve_forever()
