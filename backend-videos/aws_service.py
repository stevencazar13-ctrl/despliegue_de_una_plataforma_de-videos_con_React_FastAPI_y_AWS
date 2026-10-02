import os
import boto3
import uuid
from botocore.exceptions import ClientError
from botocore.client import Config
from dotenv import load_dotenv

load_dotenv()

REGION = os.getenv("AWS_REGION", "us-east-1")
BUCKET_VIDEOS = os.getenv("AWS_BUCKET_VIDEOS")
BUCKET_THUMBNAILS = os.getenv("AWS_BUCKET_THUMBNAILS")

s3_client = boto3.client(
    's3',
    region_name=REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),       
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"), 
    config=Config(signature_version='s3v4')
)

def generate_presigned_url(original_filename: str, content_type: str, is_video: bool):
    target_bucket = BUCKET_VIDEOS if is_video else BUCKET_THUMBNAILS
    
    extension = original_filename.rsplit('.', 1)[-1] if '.' in original_filename else ''
    unique_filename = f"{uuid.uuid4()}.{extension}" if extension else f"{uuid.uuid4()}"
    
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
        
        if REGION == "us-east-1":
            public_url = f"https://{target_bucket}.s3.amazonaws.com/{unique_filename}"
        else:
            public_url = f"https://{target_bucket}.s3.{REGION}.amazonaws.com/{unique_filename}"
            
        return {
            "upload_url": presigned_url, 
            "public_url": public_url,
            "key": unique_filename
        }
    
    except ClientError as e:
        print(f"Error generando URL pre-firmada: {e}")
        return None