class TextProcessor:
    """
    Minimal text processing utility for document service and tests.
    """
    @staticmethod
    def normalize(text: str) -> str:
        """Basic normalization: strip, lower, collapse whitespace."""
        import re
        return re.sub(r'\s+', ' ', text.strip().lower())

    @staticmethod
    def tokenize(text: str) -> list:
        """Very simple whitespace tokenizer."""
        return text.split()

    @staticmethod
    def redact(text: str, words: list) -> str:
        """Redact all occurrences of words in the text (case-insensitive)."""
        import re
        pattern = re.compile(r'(' + '|'.join(map(re.escape, words)) + r')', re.IGNORECASE)
        return pattern.sub('[REDACTED]', text)

    @staticmethod
    def process_text(text: str) -> str:
        """Stub: just normalize for now."""
        return TextProcessor.normalize(text)

    @staticmethod
    def process_markdown(text: str) -> str:
        """Stub: treat markdown as plain text for now."""
        return TextProcessor.normalize(text)

    @staticmethod
    def generate_summary(text: str) -> str:
        """Stub: return first sentence or first 20 words as summary."""
        import re
        sentences = re.split(r'(?<=[.!?]) +', text)
        if sentences:
            return sentences[0]
        return ' '.join(text.split()[:20])

    @staticmethod
    def redact_sensitive_info(text: str, terms=None) -> str:
        """Stub: redact provided sensitive terms (case-insensitive)."""
        if not terms:
            return text
        return TextProcessor.redact(text, terms)

    @staticmethod
    def spellcheck(text: str) -> str:
        """Stub: return the original text (no-op)."""
        return text
