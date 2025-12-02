import json
import requests
import base64
import os
import re
import time

# ================= 配置区域 =================
# 同源生图接口地址（优先使用 dev proxy / vercel 同源，避免跨域与密钥暴露）
API_ENDPOINT = os.environ.get("SAME_IMAGE_ENDPOINT", "http://127.0.0.1:8788/generate_image").strip()
OUTPUT_DIR = "generated_comics"

# ================= 辅助函数 =================

def encode_image_to_base64(image_path):
    """读取图片并转换为Base64字符串"""
    if not os.path.exists(image_path):
        print(f"⚠️ 警告: 参考图路径不存在 {image_path}")
        return None
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        return f"data:image/png;base64,{encoded_string}"

def save_base64_image(base64_str, output_path):
    """保存Base64图片到本地"""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        img_data = base64.b64decode(base64_str)
        with open(output_path, "wb") as f:
            f.write(img_data)
        return True
    except Exception as e:
        print(f"❌ 保存图片失败 {output_path}: {e}")
        return False

def call_image_api(prompt_text, base64_ref_img, aspect_ratio="2:3", image_size="2k"):
    """调用同源生图接口 /generate_image，返回包含 image_data_url 的 JSON。"""
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }

    payload = json.dumps({
        "prompt": prompt_text,
        "image_base64": base64_ref_img.split(",", 1)[1] if (base64_ref_img and "," in base64_ref_img) else (base64_ref_img or ""),
        "aspect_ratio": aspect_ratio,
        "image_size": image_size
    }, ensure_ascii=False)

    try:
        response = requests.post(API_ENDPOINT, headers=headers, data=payload, timeout=120)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ 同源生图接口请求异常: {e}")
        return None


# ================= 核心逻辑类 =================

class ComicGenerator:
    def __init__(self):
        if not os.path.exists(OUTPUT_DIR):
            os.makedirs(OUTPUT_DIR)
            
    def sanitize_text(self, text):
        """
        基础清洗：替换可能导致模型拒绝生成的极度敏感词汇。
        注意：即使是交给模型处理，如果Input Prompt包含违禁词，请求可能在到达绘图模型前就被拦截。
        """
        if not text: return ""
        replacements = {
            "sex": "intimacy",
            "fuck": "damn", # 或者其他语气词
            "kill": "end",
            "naked": "exposed",
            "nude": "bare"
        }
        # 简单替换，保留原意但降低敏感度
        for bad, good in replacements.items():
            text = re.sub(r'\b' + bad + r'\b', good, text, flags=re.IGNORECASE)
        return text

    def process_entry(self, data):
        print(f"🎬 正在生成单页漫画...")

        # 1. 准备参考图
        img_path = data['image_path']
        base64_ref_img = encode_image_to_base64(img_path)
        
        if not base64_ref_img:
            print(f"   ⚠️ 跳过: 无法加载参考图")
            return

        # 2. 获取并清洗原始文本 (不再截断，而是清洗敏感词后全部传入)
        raw_dialogue = self.sanitize_text(data.get('content', ''))
        event_info = json.dumps(data["event_info"], ensure_ascii=False)
        
        # 3. 构建 Prompt
        # 核心修改：移除硬编码的对话提取，增加指令让模型自己选择
        prompt_text = f"""
        **Role**: Master Webtoon Artist & Visual Director.
        **Task**: Create a **HIGH-QUALITY FULL COLOR** composite comic page (Vertical Grid) based on the story.
        
        **Reference**: 
        - The MAIN CHARACTER (MC) must strictly match the attached image.
        - **SIDE CHARACTER (SC)**: Create a **FULLY RENDERED** fictional character. **CRITICAL**: Do NOT draw the Side Character as a shadow, silhouette, or faceless figure. They must have visible eyes, hair, and detailed clothing, just like the MC.
        
        **Source Material**:
        - **Context**: {event_info}
        - **Raw Input**: "{raw_dialogue}"
        
        **Visual Style: RICH & FULL COLOR (CRITICAL)**:
        1. **Color Mode**: **FULL COLOR ONLY**. Use vibrant, cinematic lighting. **NO black & white**.
        2. **Visual Richness**: **NO EMPTY BACKGROUNDS**. Fill voids with **Colored Speed Lines**, **Particles/Bokeh**, or **Detailed Scenery**.
        3. **Dynamic Camera**: Use **Dutch Angles**, **Over-the-Shoulder**, or **Fisheye Lens**.
        
        **Text & Bubble Logic (SMART CLEANING)**:
        1. **Language**: **SIMPLIFIED CHINESE (简体中文)**.
        2. **TEXT CLEANING PROTOCOL (STRICT)**: 
           - **Remove Names**: Do NOT put "CharacterName:" inside the bubble.
           - **Remove Symbols**: Do NOT put `( )` or `* *` inside the bubble. 
           - **Output**: Only display the **pure message**.
             (e.g., Input: "Tom: *Sigh* (I love her)" -> Bubble Text: "I love her")
        3. **Bubble Type Selection**: 
           - Use the raw symbols (`()`/`**`) ONLY to decide the shape, then delete them.
           - **Spoken** (Normal text) -> **Solid Oval Bubble**.
           - **Thought** (Text in brackets) -> **Cloud/Square Bubble**.
        4. **Magnetic Alignment**: 
           - If Character is on the Right -> Bubble on the Right.
           - If Character is on the Left -> Bubble on the Left.
           - Tail points to the head.
        
        **Panel Layout Directives**:
           - **Panel 1 (Top - Context)**: Wide Shot. Establish the scene with **Rich Environmental Details**.
           - **Panel 2 (Middle - Interaction)**: **Dynamic Interaction**. **Over-the-Shoulder** shot. **Fully Visible SC and MC**. Focus on their relationship. **Priority: Dialogue (Oval Bubbles)**.
           - **Panel 3 (Bottom - Emotion)**: **Extreme Close-up**. Focus on the MC's eyes/lips. **Priority: Inner Thought (Cloud/Square Bubbles)**. Use a **"Background Effect"** (Color Bloom/Flowers/Thunder) to visually represent the specific emotion.
        
        **Safety & Atmosphere**:
        - Represent "intimacy" or "sexy" themes using **Sensual Atmosphere** (sweat, flushing, soft focus).
        - NO explicit nudity. Keep it artistic.
        
        Generate ONE single FULL-COLOR composite image with rich visual details.
        """

        # 4. 组装消息
        message_content = [
            {"type": "text", "text": prompt_text},
            {"type": "image_url", "image_url": {"url": base64_ref_img}}
        ]
        
        messages = [{"role": "user", "content": message_content}]

        # 5. 调用同源生图接口
        print("   ⏳ 调用同源生图接口生成漫画页...")
        start_time = time.time()
        result = call_image_api(prompt_text, base64_ref_img)

        # 6. 处理结果
        if result and isinstance(result, dict):
            img_data_url = result.get('image_data_url') or ''
            if img_data_url:
                file_name = f"banana_comic_page.png"
                save_path = os.path.join(OUTPUT_DIR, file_name)
                if save_base64_image(img_data_url, save_path):
                    print(f"   ✅ 漫画页已保存: {save_path}")
            else:
                print("   ⚠️ 同源接口未返回 image_data_url")
        else:
            print("   ❌ 同源接口调用失败，可能是输入被拦截或上游错误")
        end_time = time.time()
        print(f"   ⏱️ 接口用时: {end_time - start_time:.2f} 秒")


# ================= 主程序 =================
if __name__ == "__main__":
    gen = ComicGenerator()
    
    data = {
        # "image_path": "本地图片路径/参考图.png",
        "image_path": "images/0.png",
        "content": "人物对话文本，包含可能的括号和星号等符号。",
        "event_info": {
            "time": "时间信息，可以不填",
            "location": "地点信息，可以不填",
            "main_character": "主角（本地参考图对应的角色）描述（姓名、性别），应该在content中出现", 
        }
    }
    gen.process_entry(data)
