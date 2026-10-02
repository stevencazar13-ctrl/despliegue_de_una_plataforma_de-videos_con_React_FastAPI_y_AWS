import os
import boto3
import uuid
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()
s3_client = boto3.client('s3', region_name='us-east-1')

BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")

def generate_presigned_url(original_filename: str, content_type: str):
    """
    Genera una URL temporal para que el frontend suba el archivo directamente a S3.
    """
    extension = original_filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{extension}"
    
    try:
        presigned_url = s3_client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': unique_filename,
                'ContentType': content_type
            },
            ExpiresIn=3600 
        )
        
        public_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{unique_filename}"
        
        return {"upload_url": presigned_url, "public_url": public_url}
    
    except ClientError as e:
        print(f"Error generando URL pre-firmada: {e}")
        return None