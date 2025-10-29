import os
from pathlib import Path
import re


def generate_description(filename: str, video_path: str) -> str:
    """
    Generate a TikTok description from the video filename
    For now, uses filename-based heuristics
    TODO: Integrate OpenAI API for actual AI generation
    """
    # Remove extension
    name = Path(filename).stem
    
    # Replace underscores and dashes with spaces
    name = name.replace("_", " ").replace("-", " ")
    
    # Remove numbers at the start/end
    name = re.sub(r'^\d+\s*', '', name)
    name = re.sub(r'\s*\d+$', '', name)
    
    # Capitalize
    name = name.title()
    
    # Add some generic hashtags
    description = f"{name} #fyp #viral #trending"
    
    return description[:150]  # TikTok description limit


def generate_description_openai(filename: str, video_path: str) -> str:
    """
    Generate description using OpenAI API
    Uncomment and use OPENAI_API_KEY env var when ready
    """
    # from openai import OpenAI
    # client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    # 
    # response = client.chat.completions.create(
    #     model="gpt-4",
    #     messages=[
    #         {"role": "system", "content": "You are a TikTok content creator. Generate engaging descriptions with hashtags."},
    #         {"role": "user", "content": f"Generate a TikTok description for a video titled: {filename}"}
    #     ]
    # )
    # return response.choices[0].message.content
    
    return generate_description(filename, video_path)

