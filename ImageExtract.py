from PIL import Image
import pytesseract
import enum

class OS(enum.Enum):
    Mac = "Mac"
    Windows = "Windows"

class Languages(enum.Enum):
    ENG = 'eng'

class ImageReader:
    def __init__(self, os: OS):
        if os == OS.Mac:
            print('Running on MAC\n')
        elif os == OS.Windows:
            pytesseract.tesseract_cmd = r'C:/Program Files/Tesseract-OCR/tesseract.exe'
            print('Running on Windows\n')

    def extract_text(self, image: str, lang: str) -> str:
        img = Image.open(image)
        extracted_text = pytesseract.image_to_string(img, lang=lang)
        return extracted_text

ir = ImageReader(OS.Windows)
text = ir.extract_text('IMG_3089.jpeg', lang='eng')
print(text)
