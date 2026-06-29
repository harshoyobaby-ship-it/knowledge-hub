from app.utils.text import chunk_text, clean_text


def test_clean_text_normalizes_whitespace():
    raw = "Hello   world\r\n\r\n\r\nTest"
    assert clean_text(raw) == "Hello world\n\nTest"


def test_chunk_text_with_overlap():
    text = "a" * 1000
    chunks = chunk_text(text, chunk_size=800, chunk_overlap=150)
    assert len(chunks) >= 2
    assert all(len(c) <= 800 for c in chunks)


def test_chunk_text_empty():
    assert chunk_text("") == []
