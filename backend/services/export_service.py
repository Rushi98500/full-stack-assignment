import csv
import io
import json
from typing import Optional, Dict, Any
from models.document import Document


class ExportService:
    @staticmethod
    def flatten_json(data: Dict[str, Any], parent_key: str = '', sep: str = '_') -> Dict[str, Any]:
        """Flatten nested JSON structure"""
        items = []
        for key, value in data.items():
            new_key = f"{parent_key}{sep}{key}" if parent_key else key
            if isinstance(value, dict):
                items.extend(ExportService.flatten_json(value, new_key, sep=sep).items())
            elif isinstance(value, list):
                items.append((new_key, ', '.join(str(v) for v in value)))
            else:
                items.append((new_key, value))
        return dict(items)
    
    @staticmethod
    def export_to_json(document: Document) -> str:
        """Export document to JSON format"""
        result = document.reviewed_result if document.reviewed_result else document.raw_result
        return json.dumps(result, indent=2)
    
    @staticmethod
    def export_to_csv(document: Document) -> str:
        """Export document to CSV format"""
        result = document.reviewed_result if document.reviewed_result else document.raw_result
        
        if not result:
            return ""
        
        flattened = ExportService.flatten_json(result)
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["field", "value"])
        for key, value in flattened.items():
            writer.writerow([key, value])
        
        return output.getvalue()
