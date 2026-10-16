export interface paths {
    "/api/v1/cases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Cases */
        get: operations["listCases"];
        put?: never;
        /** Create Case */
        post: operations["createCase"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Case */
        get: operations["getCase"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Workspace */
        get: operations["getReviewWorkspace"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/ai-traces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ai Calls */
        get: operations["listReviewAICalls"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/ai-traces/{trace_id}/content": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ai Call Content */
        get: operations["downloadReviewAICall"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/applicability/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Set Applicability */
        post: operations["setDocumentApplicability"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Approve */
        post: operations["approveReviewRevision"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/confirm-fields": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Confirm Fields */
        post: operations["confirmConsistentFields"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Upload Document */
        post: operations["uploadReviewDocument"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/documents/{document_id}/content": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Document Content */
        get: operations["getReviewDocumentContent"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/documents/{document_id}/replace": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Replace Document */
        post: operations["replaceReviewDocument"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/documents/{document_id}/transcript": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Transcript */
        post: operations["recordPageTranscript"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/documents/{document_id}/withdraw": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Withdraw Document */
        post: operations["withdrawReviewDocument"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/draft-exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Draft Export */
        post: operations["createDraftExcelExport"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Export */
        post: operations["createExcelExport"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/exports/{export_id}/content": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download Export */
        get: operations["downloadExcelExport"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/extractions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Extractions */
        get: operations["listReviewExtractions"];
        put?: never;
        /** Start Extraction */
        post: operations["startReviewExtraction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/extractions/{job_id}/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Apply Extraction */
        post: operations["applyReviewExtraction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/extractions/{job_id}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Retry Extraction */
        post: operations["retryReviewExtraction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/fields/{field}/canonical": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Edit Consolidated */
        post: operations["editConsolidatedValue"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/fields/{field}/canonical/withdraw": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Withdraw Consolidated */
        post: operations["withdrawConsolidatedValue"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/fields/{field}/selection": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Select Canonical */
        post: operations["selectCanonicalValue"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/logical-documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Classify Document */
        post: operations["classifyReviewDocument"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/logical-documents/{logical_id}/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Verify Logical */
        post: operations["verifyLogicalDocument"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/logical-documents/{logical_id}/withdraw": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Withdraw Logical */
        post: operations["withdrawLogicalDocument"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/observations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Record Observation */
        post: operations["recordObservation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/observations/{observation_id}/correct": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Correct Observation */
        post: operations["correctObservation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/observations/{observation_id}/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Verify Observation */
        post: operations["verifyObservation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/observations/{observation_id}/withdraw": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Withdraw Observation */
        post: operations["withdrawObservation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/policy": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Adopt Policy */
        post: operations["adoptReviewPolicy"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/processing": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Processing */
        get: operations["listDocumentSetProcessing"];
        put?: never;
        /** Process Documents */
        post: operations["processDocumentSet"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/processing-capabilities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Processing Capabilities */
        get: operations["getReviewProcessingCapabilities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/reconciliations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Reconciliations */
        get: operations["listAIReconciliations"];
        put?: never;
        /** Start Reconciliation */
        post: operations["startAIReconciliation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/reconciliations/{job_id}/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Confirm Reconciliation */
        post: operations["confirmAIReconciliation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/stage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Set Stage */
        post: operations["setReviewStage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/template": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Register Template */
        post: operations["registerExcelTemplate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/review/template-profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Apply Template Profile */
        post: operations["applyExcelTemplateProfile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health/live": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Live */
        get: operations["liveness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ready */
        get: operations["readiness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/jobs/{job_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Job */
        get: operations["getJob"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reference/excel-templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Excel Templates */
        get: operations["listExcelTemplateProfiles"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reference/profiles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Profiles */
        get: operations["listProfiles"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AddressTransition */
        AddressTransition: {
            /**
             * Effective From
             * Format: date
             */
            effective_from: string;
            /** Id */
            id: string;
            /** New Aliases */
            new_aliases: string[];
            /** Old Aliases */
            old_aliases: string[];
            /** Region Aliases */
            region_aliases: string[];
            /** Source Url */
            source_url: string;
        };
        /** Applicability */
        Applicability: {
            /** Reason */
            reason: string;
            /**
             * Status
             * @enum {string}
             */
            status: "unknown" | "applicable" | "not_applicable";
        };
        /** ApplicabilityInput */
        ApplicabilityInput: {
            /** Reason */
            reason: string;
            /** Revision */
            revision: number;
            /**
             * Status
             * @enum {string}
             */
            status: "unknown" | "applicable" | "not_applicable";
        };
        /** ArithmeticResult */
        ArithmeticResult: {
            /** Actual */
            actual?: string | null;
            /** Difference */
            difference?: string | null;
            /** Expected */
            expected?: string | null;
            /** Factors */
            factors: string[];
            /** Key */
            key: string;
            /** Label */
            label: string;
            /** Result Field */
            result_field: string;
            /**
             * Status
             * @enum {string}
             */
            status: "MATCH" | "MISMATCH" | "NOT_COMPARABLE";
            /** Tolerance */
            tolerance: string;
            /** Values */
            values?: string[];
        };
        /** ArithmeticRule */
        "ArithmeticRule-Input": {
            /**
             * Decimal Places
             * @default 2
             */
            decimal_places: number;
            /** Factors */
            factors: string[];
            /** Key */
            key: string;
            /** Label */
            label: string;
            /** Result Field */
            result_field: string;
            /**
             * Tolerance
             * @default 0
             */
            tolerance: number | string;
        };
        /** ArithmeticRule */
        "ArithmeticRule-Output": {
            /**
             * Decimal Places
             * @default 2
             */
            decimal_places: number;
            /** Factors */
            factors: string[];
            /** Key */
            key: string;
            /** Label */
            label: string;
            /** Result Field */
            result_field: string;
            /**
             * Tolerance
             * @default 0
             */
            tolerance: string;
        };
        /** AuditEvent */
        AuditEvent: {
            /** Action */
            action: string;
            /**
             * Actor
             * @default local-operator
             */
            actor: string;
            /**
             * At
             * Format: date-time
             */
            at: string;
            /** Detail */
            detail: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
        };
        /** CanonicalInput */
        CanonicalInput: {
            /**
             * Number Locale
             * @default en
             * @enum {string}
             */
            number_locale: "en" | "vi";
            /** Reason */
            reason: string;
            /**
             * Reviewed
             * @default false
             */
            reviewed: boolean;
            /** Revision */
            revision: number;
            /** Source Observation Id */
            source_observation_id?: string | null;
            /** Value */
            value: string;
        };
        /** CanonicalValue */
        CanonicalValue: {
            /**
             * Actor
             * @default local-operator
             */
            actor: string;
            /** Ai Reconciliation Id */
            ai_reconciliation_id?: string | null;
            /**
             * At
             * Format: date-time
             */
            at: string;
            /** Reason */
            reason: string;
            /**
             * Reviewed
             * @default false
             */
            reviewed: boolean;
            /** Source Fingerprint */
            source_fingerprint: string;
            /** Source Ids */
            source_ids: string[];
            /** Source Observation Id */
            source_observation_id?: string | null;
            /** Unit */
            unit: string;
            /** Value */
            value: string;
            /**
             * Value Type
             * @enum {string}
             */
            value_type: "text" | "decimal";
        };
        /** Capabilities */
        Capabilities: {
            /** Ai Configured */
            ai_configured: boolean;
            /** Mock Ai Transport */
            mock_ai_transport: boolean;
            /** Ocr Available */
            ocr_available: boolean;
            /** Test Environment */
            test_environment: boolean;
        };
        /** CaseCreate */
        CaseCreate: {
            /** Procedure */
            procedure: string;
            /** Reference */
            reference: string;
            /** Title */
            title: string;
        };
        /** CasePage */
        CasePage: {
            /** Items */
            items: components["schemas"]["CaseRead"][];
            /** Limit */
            limit: number;
            /** Offset */
            offset: number;
            /** Total */
            total: number;
        };
        /** CaseRead */
        CaseRead: {
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Procedure */
            procedure: string;
            /** Reference */
            reference: string;
            /**
             * Status
             * @constant
             */
            status: "draft";
            /** Title */
            title: string;
        };
        /** Comparison */
        Comparison: {
            canonical?: components["schemas"]["CanonicalValue"] | null;
            /**
             * Canonical Stale
             * @default false
             */
            canonical_stale: boolean;
            /**
             * Consistent
             * @default false
             */
            consistent: boolean;
            /** Field */
            field: string;
            /** Observations */
            observations: components["schemas"]["Observation"][];
            /**
             * Resolved
             * @default false
             */
            resolved: boolean;
            selection: components["schemas"]["Selection"] | null;
            semantic_review?: components["schemas"]["ReviewedReconciliationDecision"] | null;
            /**
             * Source Values Differ
             * @default false
             */
            source_values_differ: boolean;
            /**
             * Status
             * @enum {string}
             */
            status: "MATCH" | "MISMATCH" | "NOT_COMPARABLE" | "NEEDS_REVIEW" | "MISSING_REQUIRED" | "EXTRACTION_UNCERTAIN";
        };
        /** ConfirmFieldsInput */
        ConfirmFieldsInput: {
            /** Fields */
            fields: string[];
            /** Reason */
            reason: string;
            /** Revision */
            revision: number;
        };
        /** CorrectionInput */
        CorrectionInput: {
            /**
             * Document Id
             * Format: uuid
             */
            document_id: string;
            /** Document Type */
            document_type: string;
            /** Field */
            field: string;
            /**
             * Number Locale
             * @default en
             * @enum {string}
             */
            number_locale: "en" | "vi";
            /** Page */
            page: number;
            /** Quote */
            quote: string;
            /** Reason */
            reason: string;
            /** Revision */
            revision: number;
            /** Source Offset */
            source_offset?: number | null;
            /**
             * Unit
             * @default
             */
            unit: string;
            /**
             * Value Type
             * @default text
             * @enum {string}
             */
            value_type: "text" | "decimal";
            /**
             * Verified
             * @default false
             */
            verified: boolean;
        };
        /** Document */
        Document: {
            /** Filename */
            filename: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Ocr Pages */
            ocr_pages?: {
                [key: string]: components["schemas"]["OCRPage"];
            };
            /** Pages */
            pages: string[];
            /** Replaced By */
            replaced_by?: string | null;
            /** Storage Key */
            storage_key: string;
            /** Transcript History */
            transcript_history?: {
                [key: string]: string[];
            };
            /** Transcripts */
            transcripts?: {
                [key: string]: string;
            };
            /** Withdrawal Reason */
            withdrawal_reason?: string | null;
            /**
             * Withdrawn
             * @default false
             */
            withdrawn: boolean;
        };
        /** DocumentRequirement */
        DocumentRequirement: {
            /** Any Of */
            any_of: string[];
            /** Key */
            key: string;
            /** Label */
            label: string;
            /**
             * When
             * @default always
             * @enum {string}
             */
            when: "always" | "arrival_confirmed" | "applicable";
        };
        /** DraftExportInput */
        DraftExportInput: {
            /**
             * Locale
             * @default vi
             * @enum {string}
             */
            locale: "en" | "vi";
            /** Reason */
            reason: string;
            /** Revision */
            revision: number;
        };
        /** ErrorBody */
        ErrorBody: {
            /** Code */
            code: string;
            /** Message */
            message: string;
            /** Request Id */
            request_id: string;
        };
        /** ErrorResponse */
        ErrorResponse: {
            error: components["schemas"]["ErrorBody"];
        };
        /** ExportRecord */
        ExportRecord: {
            ai_reconciliation_snapshot?: components["schemas"]["ReconciliationBatch"] | null;
            /** Annotation Fields */
            annotation_fields?: string[];
            /** Applicability Snapshot */
            applicability_snapshot?: {
                [key: string]: components["schemas"]["Applicability"];
            };
            /**
             * At
             * Format: date-time
             */
            at: string;
            /** Blockers Snapshot */
            blockers_snapshot?: string[];
            /** Canonical Snapshot */
            canonical_snapshot?: {
                [key: string]: components["schemas"]["CanonicalValue"];
            };
            /** Filename */
            filename: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Kind
             * @default approved
             * @enum {string}
             */
            kind: "approved" | "draft";
            /** Logical Documents Snapshot */
            logical_documents_snapshot?: components["schemas"]["LogicalDocument"][];
            /** Mapping Snapshot */
            mapping_snapshot?: components["schemas"]["Mapping"][];
            /** Mapping Version */
            mapping_version: string;
            /** Missing Fields */
            missing_fields?: string[];
            /** Observations Snapshot */
            observations_snapshot?: components["schemas"]["Observation"][];
            /** Ocr Snapshot */
            ocr_snapshot?: {
                [key: string]: {
                    [key: string]: components["schemas"]["OCRPage"];
                };
            };
            policy_snapshot?: components["schemas"]["ReviewPolicy-Output"] | null;
            /**
             * Reason
             * @default
             */
            reason: string;
            /** Selected Observations */
            selected_observations?: {
                [key: string]: string;
            };
            /** Source Revision */
            source_revision: number;
            /**
             * Stage
             * @default pre_arrival
             * @enum {string}
             */
            stage: "pre_arrival" | "arrival_confirmed";
            /** Storage Key */
            storage_key: string;
            /** Template Version */
            template_version: string;
            /** Transcript Snapshot */
            transcript_snapshot?: {
                [key: string]: {
                    [key: string]: string;
                };
            };
            /** Values Snapshot */
            values_snapshot?: {
                [key: string]: string | null;
            };
        };
        /** ExtractionInput */
        ExtractionInput: {
            /**
             * Document Id
             * Format: uuid
             */
            document_id: string;
            /** Fields */
            fields: components["schemas"]["FieldRule"][];
            /** Revision */
            revision: number;
        };
        /** ExtractionRun */
        ExtractionRun: {
            /**
             * Accepted Count
             * @default 0
             */
            accepted_count: number;
            /**
             * Applied
             * @default false
             */
            applied: boolean;
            /**
             * Document Id
             * Format: uuid
             */
            document_id: string;
            /** Error Code */
            error_code: string | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Model */
            model?: string | null;
            /** Prompt Version */
            prompt_version?: string | null;
            /**
             * Rejected Count
             * @default 0
             */
            rejected_count: number;
            /** Source Revision */
            source_revision: number;
            /** Status */
            status: string;
        };
        /** FieldRule */
        FieldRule: {
            /**
             * Description
             * @default
             */
            description: string;
            /** Field */
            field: string;
            /** Label */
            label: string;
            /**
             * Normalization
             * @default exact
             * @enum {string}
             */
            normalization: "exact" | "text" | "identifier" | "date" | "currency";
            /** Preferred Sources */
            preferred_sources?: string[];
            /**
             * Required
             * @default true
             */
            required: boolean;
            /**
             * Unit
             * @default
             */
            unit: string;
            /**
             * Value Type
             * @default text
             * @enum {string}
             */
            value_type: "text" | "decimal";
        };
        /** HealthRead */
        HealthRead: {
            /**
             * Status
             * @default ok
             * @constant
             */
            status: "ok";
        };
        /** JobRead */
        JobRead: {
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Error Code */
            error_code: string | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Kind */
            kind: string;
            /**
             * Status
             * @enum {string}
             */
            status: "pending" | "running" | "succeeded" | "failed" | "interrupted";
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** LogicalDocument */
        LogicalDocument: {
            /** Confidence */
            confidence?: number | null;
            /**
             * Document Id
             * Format: uuid
             */
            document_id: string;
            /** Document Type */
            document_type: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Origin
             * @default manual
             * @enum {string}
             */
            origin: "manual" | "ai";
            /** Page From */
            page_from: number;
            /** Page To */
            page_to: number;
            /** Reason */
            reason: string;
            /**
             * Verified
             * @default true
             */
            verified: boolean;
            /**
             * Withdrawn
             * @default false
             */
            withdrawn: boolean;
        };
        /** LogicalDocumentInput */
        LogicalDocumentInput: {
            /**
             * Document Id
             * Format: uuid
             */
            document_id: string;
            /** Document Type */
            document_type: string;
            /** Page From */
            page_from: number;
            /** Page To */
            page_to: number;
            /** Reason */
            reason: string;
            /** Revision */
            revision: number;
        };
        /** Mapping */
        Mapping: {
            /** Cell */
            cell: string;
            /** Field */
            field: string;
            /**
             * Required
             * @default true
             */
            required: boolean;
            /** Sheet */
            sheet: string;
        };
        /** OCRPage */
        OCRPage: {
            /** Confidence */
            confidence: number;
            /**
             * Is Blank
             * @default false
             */
            is_blank: boolean;
            /**
             * Rotation
             * @default 0
             */
            rotation: number;
            /** Text */
            text: string;
            /** Words */
            words: components["schemas"]["OCRWord"][];
        };
        /** OCRWord */
        OCRWord: {
            /** Box */
            box: number[];
            /** Confidence */
            confidence: number;
            /** Offset */
            offset: number;
            /** Text */
            text: string;
        };
        /** Observation */
        Observation: {
            /** Change Reason */
            change_reason?: string | null;
            /**
             * Document Id
             * Format: uuid
             */
            document_id: string;
            /** Document Type */
            document_type: string;
            /** Extraction Confidence */
            extraction_confidence?: number | null;
            /** Extraction Run Id */
            extraction_run_id?: string | null;
            /** Field */
            field: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Line Identity Quote */
            line_identity_quote?: string | null;
            /** Normalized */
            normalized: string;
            /**
             * Number Locale
             * @default en
             * @enum {string}
             */
            number_locale: "en" | "vi";
            /** Offset */
            offset: number;
            /**
             * Origin
             * @default manual
             * @enum {string}
             */
            origin: "manual" | "ai";
            /** Page */
            page: number;
            /** Primary Line Source Ids */
            primary_line_source_ids?: string[];
            /** Quote */
            quote: string;
            /** Replacement Id */
            replacement_id?: string | null;
            /**
             * Source Kind
             * @default pdf_text
             * @enum {string}
             */
            source_kind: "pdf_text" | "human_transcript" | "ocr";
            /** Source Unit */
            source_unit?: string | null;
            /**
             * State
             * @default active
             * @enum {string}
             */
            state: "active" | "withdrawn" | "superseded";
            /** Unit */
            unit: string;
            /**
             * Value Type
             * @enum {string}
             */
            value_type: "text" | "decimal";
            /** Verified */
            verified: boolean;
        };
        /** ObservationInput */
        ObservationInput: {
            /**
             * Document Id
             * Format: uuid
             */
            document_id: string;
            /** Document Type */
            document_type: string;
            /** Field */
            field: string;
            /**
             * Number Locale
             * @default en
             * @enum {string}
             */
            number_locale: "en" | "vi";
            /** Page */
            page: number;
            /** Quote */
            quote: string;
            /** Revision */
            revision: number;
            /** Source Offset */
            source_offset?: number | null;
            /**
             * Unit
             * @default
             */
            unit: string;
            /**
             * Value Type
             * @default text
             * @enum {string}
             */
            value_type: "text" | "decimal";
            /**
             * Verified
             * @default false
             */
            verified: boolean;
        };
        /** PolicyInput */
        PolicyInput: {
            policy: components["schemas"]["ReviewPolicy-Input"];
            /** Reason */
            reason: string;
            /** Revision */
            revision: number;
        };
        /** PortRelation */
        PortRelation: {
            /** Canonical Value */
            canonical_value: string;
            /** Fields */
            fields: string[];
            /** Id */
            id: string;
            /** Port Aliases */
            port_aliases: string[];
            /** Source Url */
            source_url: string;
            /** Terminal Aliases */
            terminal_aliases: string[];
        };
        /** ProcessingInput */
        ProcessingInput: {
            /** Primary Invoice Id */
            primary_invoice_id?: string | null;
            /** Revision */
            revision: number;
        };
        /** ProcessingRun */
        ProcessingRun: {
            /**
             * Accepted Count
             * @default 0
             */
            accepted_count: number;
            /**
             * Applied
             * @default false
             */
            applied: boolean;
            /** Error Code */
            error_code: string | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Ocr Count
             * @default 0
             */
            ocr_count: number;
            progress?: components["schemas"]["Progress"];
            /**
             * Rejected Count
             * @default 0
             */
            rejected_count: number;
            /** Rejection Reasons */
            rejection_reasons?: {
                [key: string]: number;
            };
            /** Source Revision */
            source_revision: number;
            /** Status */
            status: string;
        };
        /** ProfileInput */
        ProfileInput: {
            /**
             * Adopt Profile Rules
             * @default false
             */
            adopt_profile_rules: boolean;
            /** Counts */
            counts?: {
                [key: string]: number;
            };
            /** Profile Id */
            profile_id: string;
            /** Reason */
            reason: string;
            /** Revision */
            revision: number;
        };
        /** ProfileRead */
        ProfileRead: {
            /** Code */
            code: string;
            /** Name */
            name: string;
        };
        /** Progress */
        Progress: {
            /**
             * Completed
             * @default 0
             */
            completed: number;
            /** Document Id */
            document_id?: string | null;
            /**
             * Phase
             * @default queued
             * @enum {string}
             */
            phase: "queued" | "ocr" | "classification" | "extraction" | "saving" | "completed";
            /**
             * Total
             * @default 0
             */
            total: number;
        };
        /** Readiness */
        Readiness: {
            /** Approved */
            approved: boolean;
            /** Arithmetic Checks */
            arithmetic_checks?: components["schemas"]["ArithmeticResult"][];
            /** Blockers */
            blockers: string[];
            /** Comparisons */
            comparisons: components["schemas"]["Comparison"][];
            /** Eligible */
            eligible: boolean;
            /** Revision */
            revision: number;
            /** Warnings */
            warnings?: string[];
        };
        /** ReconciliationApply */
        ReconciliationApply: {
            /** Fields */
            fields: string[];
            /** Reason */
            reason: string;
            /**
             * Reviewed
             * @default false
             */
            reviewed: boolean;
            /** Revision */
            revision: number;
        };
        /** ReconciliationBatch */
        ReconciliationBatch: {
            /**
             * At
             * Format: date-time
             */
            at: string;
            /** Decisions */
            decisions: components["schemas"]["ReviewedReconciliationDecision"][];
            /** Fingerprint */
            fingerprint: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Locale
             * @enum {string}
             */
            locale: "en" | "vi";
            /** Model */
            model: string;
            /** Prompt Version */
            prompt_version: string;
            /** Provider Request Id */
            provider_request_id?: string | null;
            /** Source Revision */
            source_revision: number;
            /** Trace Id */
            trace_id?: string | null;
        };
        /** ReconciliationInput */
        ReconciliationInput: {
            /**
             * Locale
             * @default vi
             * @enum {string}
             */
            locale: "en" | "vi";
            /** Revision */
            revision: number;
        };
        /** ReconciliationRun */
        ReconciliationRun: {
            batch?: components["schemas"]["ReconciliationBatch"] | null;
            /** Current */
            current: boolean;
            /** Error Code */
            error_code: string | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Request Count */
            request_count: number;
            /** Source Revision */
            source_revision: number;
            /** Status */
            status: string;
        };
        /** ReplacementInput */
        ReplacementInput: {
            /** Content Base64 */
            content_base64: string;
            /** Filename */
            filename: string;
            /** Reason */
            reason: string;
            /** Revision */
            revision: number;
        };
        /** ReviewPolicy */
        "ReviewPolicy-Input": {
            /** Arithmetic Checks */
            arithmetic_checks?: components["schemas"]["ArithmeticRule-Input"][];
            /** Document Requirements */
            document_requirements?: components["schemas"]["DocumentRequirement"][];
            /** Fields */
            fields?: components["schemas"]["FieldRule"][];
            /** Name */
            name: string;
            /** Procedures */
            procedures?: string[];
            /** Required Documents */
            required_documents?: string[];
            /**
             * Status
             * @default proposal
             * @enum {string}
             */
            status: "proposal" | "project_baseline";
            /** Version */
            version: string;
        };
        /** ReviewPolicy */
        "ReviewPolicy-Output": {
            /** Arithmetic Checks */
            arithmetic_checks?: components["schemas"]["ArithmeticRule-Output"][];
            /** Document Requirements */
            document_requirements?: components["schemas"]["DocumentRequirement"][];
            /** Fields */
            fields?: components["schemas"]["FieldRule"][];
            /** Name */
            name: string;
            /** Procedures */
            procedures?: string[];
            /** Required Documents */
            required_documents?: string[];
            /**
             * Status
             * @default proposal
             * @enum {string}
             */
            status: "proposal" | "project_baseline";
            /** Version */
            version: string;
        };
        /** ReviewedReconciliationDecision */
        ReviewedReconciliationDecision: {
            /** Address References */
            address_references?: components["schemas"]["AddressTransition"][];
            /**
             * Classification
             * @enum {string}
             */
            classification: "equivalent" | "different" | "uncertain";
            /** Field */
            field: string;
            /** Guard Code */
            guard_code?: string | null;
            /** Port References */
            port_references?: components["schemas"]["PortRelation"][];
            /** Proposed Value */
            proposed_value?: string | null;
            /** Reason */
            reason: string;
            /** Source Fingerprint */
            source_fingerprint: string;
            /** Source Ids */
            source_ids: string[];
            /** Source Observation Id */
            source_observation_id?: string | null;
        };
        /** Revision */
        Revision: {
            /** Revision */
            revision: number;
        };
        /** Selection */
        Selection: {
            /**
             * Observation Id
             * Format: uuid
             */
            observation_id: string;
            /** Reason */
            reason: string;
        };
        /** SelectionInput */
        SelectionInput: {
            /**
             * Observation Id
             * Format: uuid
             */
            observation_id: string;
            /** Reason */
            reason: string;
            /** Revision */
            revision: number;
        };
        /** StageInput */
        StageInput: {
            /** Reason */
            reason: string;
            /** Revision */
            revision: number;
            /**
             * Stage
             * @enum {string}
             */
            stage: "pre_arrival" | "arrival_confirmed";
        };
        /** Template */
        Template: {
            /** Filename */
            filename: string;
            /** Mapping Version */
            mapping_version: string;
            /** Mappings */
            mappings: components["schemas"]["Mapping"][];
            /**
             * Missing Values
             * @default block
             * @enum {string}
             */
            missing_values: "block" | "highlight";
            /** Profile Id */
            profile_id?: string | null;
            /** Repeat Counts */
            repeat_counts?: {
                [key: string]: number;
            };
            /** Storage Key */
            storage_key: string;
            /** Version */
            version: string;
        };
        /** TemplateInput */
        TemplateInput: {
            /** Content Base64 */
            content_base64: string;
            /** Filename */
            filename: string;
            /** Mapping Version */
            mapping_version: string;
            /** Mappings */
            mappings: components["schemas"]["Mapping"][];
            /** Revision */
            revision: number;
            /** Version */
            version: string;
        };
        /** TemplateProfileRead */
        TemplateProfileRead: {
            /** Groups */
            groups: {
                [key: string]: number;
            };
            /** Id */
            id: string;
            /** Name Key */
            name_key: string;
            /** Version */
            version: string;
        };
        /** TracePage */
        TracePage: {
            /** Enabled */
            enabled: boolean;
            /** Items */
            items: components["schemas"]["TraceSummary"][];
            /** Limit */
            limit: number;
            /** Offset */
            offset: number;
            /** Total */
            total: number;
        };
        /** TraceSummary */
        TraceSummary: {
            /**
             * At
             * Format: date-time
             */
            at: string;
            /**
             * Case Id
             * Format: uuid
             */
            case_id: string;
            /** Document Id */
            document_id: string | null;
            /** Duration Ms */
            duration_ms: number;
            /** Error Code */
            error_code: string | null;
            /** Fields */
            fields: string[];
            /** Http Status */
            http_status: number | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Image Count */
            image_count: number;
            /** Job Id */
            job_id: string | null;
            /** Model */
            model: string;
            /** Pages */
            pages: number[];
            /** Phase */
            phase: string;
            /** Provider Request Id */
            provider_request_id: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "running" | "succeeded" | "failed";
            /** Validation */
            validation?: components["schemas"]["TraceValidation"][];
        };
        /** TraceValidation */
        TraceValidation: {
            /** Document Type */
            document_type?: string | null;
            /** Error Code */
            error_code?: string | null;
            /** Field */
            field?: string | null;
            /** Normalized */
            normalized?: string | null;
            /** Page */
            page?: number | null;
            /** Page From */
            page_from?: number | null;
            /** Page To */
            page_to?: number | null;
            /** Status */
            status: string;
        };
        /** TranscriptInput */
        TranscriptInput: {
            /** Page */
            page: number;
            /** Reason */
            reason: string;
            /** Revision */
            revision: number;
            /** Text */
            text: string;
        };
        /** Upload */
        Upload: {
            /** Content Base64 */
            content_base64: string;
            /** Filename */
            filename: string;
            /** Revision */
            revision: number;
        };
        /** VerifyInput */
        VerifyInput: {
            /** Reason */
            reason: string;
            /** Revision */
            revision: number;
        };
        /** Workspace */
        Workspace: {
            ai_reconciliation?: components["schemas"]["ReconciliationBatch"] | null;
            /** Applicability */
            applicability?: {
                [key: string]: components["schemas"]["Applicability"];
            };
            /** Applied Extractions */
            applied_extractions?: string[];
            /** Approved Revision */
            approved_revision?: number | null;
            /** Audit */
            audit?: components["schemas"]["AuditEvent"][];
            /** Canonical History */
            canonical_history?: {
                [key: string]: components["schemas"]["CanonicalValue"];
            }[];
            /** Canonical Values */
            canonical_values?: {
                [key: string]: components["schemas"]["CanonicalValue"];
            };
            /** Documents */
            documents?: components["schemas"]["Document"][];
            /** Exports */
            exports?: components["schemas"]["ExportRecord"][];
            /** Logical Documents */
            logical_documents?: components["schemas"]["LogicalDocument"][];
            /** Observations */
            observations?: components["schemas"]["Observation"][];
            policy?: components["schemas"]["ReviewPolicy-Output"] | null;
            /** Policy History */
            policy_history?: components["schemas"]["ReviewPolicy-Output"][];
            /**
             * Revision
             * @default 0
             */
            revision: number;
            /** Selections */
            selections?: {
                [key: string]: components["schemas"]["Selection"];
            };
            /**
             * Stage
             * @default pre_arrival
             * @enum {string}
             */
            stage: "pre_arrival" | "arrival_confirmed";
            template?: components["schemas"]["Template"] | null;
            /** Template History */
            template_history?: components["schemas"]["Template"][];
        };
        /** WorkspaceRead */
        WorkspaceRead: {
            readiness: components["schemas"]["Readiness"];
            workspace: components["schemas"]["Workspace"];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    listCases: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CasePage"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    createCase: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CaseCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CaseRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getCase: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CaseRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getReviewWorkspace: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listReviewAICalls: {
        parameters: {
            query?: {
                limit?: number;
                offset?: number;
            };
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TracePage"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    downloadReviewAICall: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                trace_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    setDocumentApplicability: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                key: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ApplicabilityInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    approveReviewRevision: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    confirmConsistentFields: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConfirmFieldsInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    uploadReviewDocument: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Upload"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getReviewDocumentContent: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                document_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    replaceReviewDocument: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                document_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReplacementInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    recordPageTranscript: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                document_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TranscriptInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    withdrawReviewDocument: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                document_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    createDraftExcelExport: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DraftExportInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    createExcelExport: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Revision"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    downloadExcelExport: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                export_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listReviewExtractions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExtractionRun"][];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    startReviewExtraction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExtractionInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExtractionRun"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    applyReviewExtraction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                job_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Revision"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    retryReviewExtraction: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                job_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Revision"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExtractionRun"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    editConsolidatedValue: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                field: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CanonicalInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    withdrawConsolidatedValue: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                field: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    selectCanonicalValue: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                field: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SelectionInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    classifyReviewDocument: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LogicalDocumentInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    verifyLogicalDocument: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                logical_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    withdrawLogicalDocument: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                logical_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    recordObservation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ObservationInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    correctObservation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                observation_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CorrectionInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    verifyObservation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                observation_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    withdrawObservation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                observation_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    adoptReviewPolicy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PolicyInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listDocumentSetProcessing: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProcessingRun"][];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    processDocumentSet: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProcessingInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProcessingRun"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getReviewProcessingCapabilities: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Capabilities"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listAIReconciliations: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReconciliationRun"][];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    startAIReconciliation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReconciliationInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReconciliationRun"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    confirmAIReconciliation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
                job_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReconciliationApply"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    setReviewStage: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StageInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    registerExcelTemplate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TemplateInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    applyExcelTemplateProfile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProfileInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkspaceRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    liveness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    readiness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getJob: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JobRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listExcelTemplateProfiles: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TemplateProfileRead"][];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listProfiles: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProfileRead"][];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
}
