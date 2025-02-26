import PyPDF2
import io

def extract_text_from_pdf(pdf_file):
    """从PDF文件中提取文本"""
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text