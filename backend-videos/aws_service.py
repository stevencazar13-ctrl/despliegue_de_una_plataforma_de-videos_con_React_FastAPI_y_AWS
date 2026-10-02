import os
import boto3
import uuid
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

s3_client = boto3.client('s3', region_name=os.getenv('AWS_REGION', 'us-east-1'))

BUCKET_VIDEOS = os.getenv("AWS_BUCKET_VIDEOS")
BUCKET_THUMBNAILS = os.getenv("AWS_BUCKET_THUMBNAILS")

def generate_presigned_url(original_filename: str, content_type: str, is_video: bool):
    # Elige el bucket correcto según el tipo de archivo
    target_bucket = BUCKET_VIDEOS if is_video else BUCKET_THUMBNAILS
    
    extension = original_filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{extension}"
    
    try:
        presigned_url = s3_client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': target_bucket,
                'Key': unique_filename,
                'ContentType': content_type
            },
            ExpiresIn=3600
        )
        
        public_url = f"https://{target_bucket}.s3.amazonaws.com/{unique_filename}"
        return {"upload_url": presigned_url, "public_url": public_url}
    
    except ClientError as e:
        print(f"Error generando URL pre-firmada: {e}")
        return None