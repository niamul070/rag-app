import os
import io
from typing import Optional
import PyPDF2
from bs4 import BeautifulSoup
import markdown
from fastapi import UploadFile
import logging

logger = logging.getLogger(__name__)

class DocumentService:
    def __init__(self):
        self.max_file_size = 10 * 1024 * 1024  # 10MB limit
    
    async def process_file(self, file: UploadFile) -> Optional[str]:
        """Process uploaded file and extract text content"""
        try:
            # Check file size
            content = await file.read()
            if len(content) > self.max_file_size:
                logger.warning(f"File {file.filename} exceeds size limit")
                return None
            
            # Reset file pointer
            await file.seek(0)
            
            file_extension = os.path.splitext(file.filename)[1].lower()
            
            if file_extension == '.pdf':
                return await self._process_pdf(content)
            elif file_extension in ['.html', '.htm']:
                return await self._process_html(content)
            elif file_extension == '.txt':
                return await self._process_txt(content)
            elif file_extension == '.md':
                return await self._process_markdown(content)
            else:
                logger.error(f"Unsupported file type: {file_extension}")
                return None
                
        except Exception as e:
            logger.error(f"Error processing file {file.filename}: {str(e)}")
            return None
    
    async def _process_pdf(self, content: bytes) -> Optional[str]:
        """Extract text from PDF file"""
        try:
            pdf_file = io.BytesIO(content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text.strip()
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            return None
    
    async def _process_html(self, content: bytes) -> Optional[str]:
        """Extract text from HTML file"""
        try:
            html_content = content.decode('utf-8')
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text content
            text = soup.get_text()
            
            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            return text.strip()
        except Exception as e:
            logger.error(f"Error processing HTML: {str(e)}")
            return None
    
    async def _process_txt(self, content: bytes) -> Optional[str]:
        """Extract text from TXT file"""
        try:
            # Try different encodings
            encodings = ['utf-8', 'latin-1', 'cp1252']
            
            for encoding in encodings:
                try:
                    text = content.decode(encoding)
                    return text.strip()
                except UnicodeDecodeError:
                    continue
            
            logger.error("Could not decode text file with any supported encoding")
            return None
        except Exception as e:
            logger.error(f"Error processing TXT: {str(e)}")
            return None
    
    async def _process_markdown(self, content: bytes) -> Optional[str]:
        """Extract text from Markdown file"""
        try:
            markdown_content = content.decode('utf-8')
            
            # Convert markdown to HTML first
            html = markdown.markdown(markdown_content)
            
            # Then extract text like HTML
            soup = BeautifulSoup(html, 'html.parser')
            text = soup.get_text()
            
            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            return text.strip()
        except Exception as e:
            logger.error(f"Error processing Markdown: {str(e)}")
            return None
