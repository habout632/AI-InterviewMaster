from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import io
import time

from services.pdf_service import extract_text_from_pdf
from services.openai_service import evaluate_answer
from services.interview_service import generate_questions

# 创建 FastAPI 应用
app = FastAPI(title="AI 模拟面试 API")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有源，生产环境应限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 内存中存储面试数据
interviews = {}


# 定义请求和响应模型
class InterviewTypeInfo(BaseModel):
    name: str
    percentage: int


class InterviewSettings(BaseModel):
    include_self_intro: bool = False
    question_count: int = 5
    time_limit: int = 30
    selected_model: str = "claude-3-5-sonnet"
    interview_types: Dict[str, dict] = {
        "knowledge": {"name": "题库", "percentage": 100},
        "leetcode": {"name": "LeetCode", "percentage": 0},
        "project": {"name": "项目经验", "percentage": 20}
    }


class AnswerRequest(BaseModel):
    answer: str


@app.post("/api/interview")
async def create_interview(settings: InterviewSettings):
    """创建新的面试会话"""
    interview_id = int(time.time() * 1000)  # 简单的时间戳ID

    interviews[interview_id] = {
        'id': interview_id,
        'include_self_intro': settings.include_self_intro,
        'question_count': settings.question_count,
        'time_limit': settings.time_limit,
        'selected_model': settings.selected_model,
        'interview_types': settings.interview_types,
        'questions': [],
        'scores': [],
        'current_question': 0,
        'is_completed': False
    }

    return {"id": interview_id}


@app.post("/api/interview/{interview_id}/upload")
async def upload_resume(
        interview_id: int,
        resume: UploadFile = File(...),
        jd_text: Optional[str] = Form(None)
):
    """上传简历并开始面试"""
    if interview_id not in interviews:
        raise HTTPException(status_code=404, detail="找不到面试ID")

    interview = interviews[interview_id]

    # 处理PDF文件
    resume_content = await resume.read()
    resume_bytes = io.BytesIO(resume_content)
    resume_text = extract_text_from_pdf(resume_bytes)

    # 生成问题
    interview['questions'] = await generate_questions(
        resume_text=resume_text,
        interview_types=interview['interview_types'],
        question_count=interview['question_count'],
        include_self_intro=interview['include_self_intro'],
        model_name=interview['selected_model'],
        jd_text=jd_text
    )

    # 记录开始时间
    interview['start_time'] = int(time.time())
    interview['jd_text'] = jd_text

    return {
        'questions': interview['questions'],
        'start_time': interview['start_time'],
        'time_limit': interview['time_limit']
    }


@app.post("/api/interview/{interview_id}/answer")
async def submit_answer(interview_id: int, request: AnswerRequest):
    """提交答案获取评估"""
    if interview_id not in interviews:
        raise HTTPException(status_code=404, detail="找不到面试ID")

    interview = interviews[interview_id]
    answer = request.answer

    # 获取当前问题
    try:
        current_question = interview['questions'][interview['current_question']]
    except IndexError:
        raise HTTPException(status_code=400, detail="没有更多问题")

    # 评估答案
    feedback = await evaluate_answer(
        question=current_question,
        answer=answer,
        model_name=interview['selected_model'],
        jd_text=interview.get('jd_text')
    )

    # 保存评估结果
    interview['scores'].append(feedback)
    interview['current_question'] += 1

    # 检查面试是否完成
    is_completed = interview['current_question'] >= len(interview['questions'])
    interview['is_completed'] = is_completed

    response = {
        'feedback': feedback,
        'is_completed': is_completed,
        'current_question': interview['current_question']
    }

    # 如果面试完成，添加总结
    if is_completed:
        summary = get_interview_summary(interview)
        response['summary'] = summary

    return response


@app.get("/api/interview/{interview_id}/summary")
async def get_summary(interview_id: int):
    """获取面试总结"""
    if interview_id not in interviews:
        raise HTTPException(status_code=404, detail="找不到面试ID")

    interview = interviews[interview_id]

    if not interview['is_completed']:
        raise HTTPException(status_code=400, detail="面试尚未完成")

    summary = get_interview_summary(interview)
    return summary


def get_interview_summary(interview):
    """生成面试总结"""
    # 计算总分
    total_score = 0
    question_scores = []

    for score_text in interview['scores']:
        try:
            score_line = [line for line in score_text.split('\n') if '分数：' in line][0]
            score = float(score_line.split('分数：')[1].split('/')[0])
            total_score += score
            question_scores.append(score)
        except:
            question_scores.append(0)

    # 总问题数
    total_questions = len(interview['questions'])

    # 平均分
    average_score = total_score / total_questions if total_questions > 0 else 0

    # 创建总结
    summary = {
        'total_score': total_score,
        'average_score': average_score,
        'total_questions': total_questions,
        'question_scores': question_scores,
        'questions': interview['questions'],
        'feedbacks': interview['scores'],
        'interview_types': interview['interview_types'],
        'include_self_intro': interview['include_self_intro'],
        'model': interview['selected_model'],
        'duration': interview['time_limit'],
        'date': time.strftime("%Y-%m-%d %H:%M", time.localtime(interview['start_time']))
    }

    return summary


# 启动服务器
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5000)