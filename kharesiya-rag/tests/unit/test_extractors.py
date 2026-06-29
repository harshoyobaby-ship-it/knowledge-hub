from app.utils.extractors import extract_text_from_plain


def test_extract_plain_text():
    content = b"# Hello\n\nThis is a test document."
    pages = extract_text_from_plain(content)
    assert len(pages) == 1
    assert "Hello" in pages[0].text
