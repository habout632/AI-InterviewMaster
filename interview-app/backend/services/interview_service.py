from services.openai_service import generate_questions_by_type

def calculate_type_questions(total_questions, type_percentages):
    """计算每种类型的具体题目数量"""
    type_counts = {}
    total_percentage = sum(type_percentages.values())

    if total_percentage == 0:
        return {'knowledge': total_questions}

    # 首先按比例计算
    remaining = total_questions
    for type_key, percentage in type_percentages.items():
        count = int(round(total_questions * percentage / total_percentage))
        type_counts[type_key] = min(count, remaining)
        remaining -= type_counts[type_key]

    # 如果还有剩余的题目，分配给百分比最高的类型
    if remaining > 0:
        max_type = max(type_percentages.items(), key=lambda x: x[1])[0]
        type_counts[max_type] += remaining

    return type_counts

async def generate_questions(resume_text, interview_types, question_count, include_self_intro, model_name, jd_text=None):
    """整合不同类型的问题 - 异步版本"""
    try:
        total_questions = question_count
        questions = []

        # 获取每种类型的百分比
        type_percentages = {
            type_key: type_info['percentage']
            for type_key, type_info in interview_types.items()
        }

        # 计算每种类型的具体题目数量
        type_counts = calculate_type_questions(total_questions, type_percentages)

        # 生成每种类型的问题
        for type_key, count in type_counts.items():
            if count > 0:
                type_questions = await generate_questions_by_type(resume_text, type_key, count, model_name, jd_text)
                type_name = interview_types[type_key]['name']
                questions.extend([f"[{type_name}] {q}" for q in type_questions])

        # 如果生成的问题数量不够，补充题库类型的问题
        while len(questions) < total_questions:
            questions.append(f"[题库] {len(questions) + 1}. 请描述一个相关的技术概念？")

        # 如果问题数量超出，截取需要的数量
        questions = questions[:total_questions]

        # 如果包含自我介绍，将其添加到开头
        if include_self_intro:
            intro_prompt = """
                请用3-5分钟的时间进行一个简洁的自我介绍，包括：
                1. 您的教育背景和专业领域
                2. 相关的工作经验和项目经历
                3. 您的技术特长和专业优势
                4. 为什么您认为自己适合这个职位
                请注意把控时间，突出重点，展现您的专业能力。
            """
            questions.insert(0, intro_prompt)

        return questions
    except Exception as e:
        # 出错时返回默认问题
        base_questions = [f"{i}. 请描述您的相关经验？" for i in range(1, total_questions + 1)]
        if include_self_intro:
            intro_prompt = """
                请用3-5分钟的时间进行一个简洁的自我介绍，包括：
                1. 您的教育背景和专业领域
                2. 相关的工作经验和项目经历
                3. 您的技术特长和专业优势
                4. 为什么您认为自己适合这个职位
                请注意把控时间，突出重点，展现您的专业能力。
            """
            base_questions.insert(0, intro_prompt)
        return base_questions