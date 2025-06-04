#!/usr/bin/env python3.11
import sys
from weasyprint import HTML, CSS
import argparse

# Basic CSS for styling the PDF
default_css = """
@page {
    size: A4;
    margin: 1.5cm;
}
body {
    font-family: sans-serif;
    font-size: 10pt;
    line-height: 1.4;
}
h1 {
    color: #1B3664; /* Primary color from calculator */
    text-align: center;
    margin-bottom: 1.5em;
    font-size: 18pt;
}
h2 {
    color: #00A859; /* Secondary color */
    border-bottom: 1px solid #ccc;
    padding-bottom: 0.3em;
    margin-top: 1.5em;
    margin-bottom: 1em;
    font-size: 14pt;
}
h3 {
    color: #1B3664;
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-size: 12pt;
}
ul {
    list-style: none;
    padding-left: 0;
}
li {
    margin-bottom: 0.4em;
}
strong {
    font-weight: bold;
}
.vm-block {
    border: 1px solid #eee;
    padding: 1em;
    margin-bottom: 1em;
    border-radius: 5px;
    page-break-inside: avoid;
}
.summary-section {
    margin-top: 2em;
    padding: 1em;
    background-color: #f8f8f8;
    border: 1px solid #eee;
    border-radius: 5px;
}
.summary-section p {
    margin: 0.5em 0;
}
.grand-total {
    margin-top: 1em;
    font-size: 14pt;
    font-weight: bold;
    text-align: right;
    color: #00A859;
}
"""

def create_pdf(html_file_path, output_pdf_path, css_content=default_css):
    """Converts an HTML file to a PDF file using WeasyPrint."""
    try:
        html = HTML(filename=html_file_path)
        css = CSS(string=css_content)
        html.write_pdf(output_pdf_path, stylesheets=[css])
        print(f"PDF successfully generated at: {output_pdf_path}")
    except Exception as e:
        print(f"Error generating PDF: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert HTML file to PDF using WeasyPrint.')
    parser.add_argument('html_file', help='Path to the input HTML file.')
    parser.add_argument('pdf_file', help='Path to the output PDF file.')
    # parser.add_argument('--css', help='Optional path to a CSS file.') # Option for external CSS

    args = parser.parse_args()

    # if args.css:
    #     with open(args.css, 'r', encoding='utf-8') as f:
    #         css_content = f.read()
    # else:
    #     css_content = default_css

    create_pdf(args.html_file, args.pdf_file)

