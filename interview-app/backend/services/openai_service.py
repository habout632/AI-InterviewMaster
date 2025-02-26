from openai import AsyncOpenAI

def get_model_config(model_name):
    """返回模型配置信息"""
    configs = {
        "claude-3-5-sonnet": {
            "api_key": "sk-trbFwocx3hwvWWrS7eA4770d89564207Be2046F4956eA896",
            "base_url": "https://aihubmix.com/v1",
            "model": "claude-3-5-haiku-20241022"
        },
        "deepseek-chat": {
            "api_key": "sk-trbFwocx3hwvWWrS7eA4770d89564207Be2046F4956eA896",
            "base_url": "https://aihubmix.com/v1",
            "model": "deepseek-chat"
        },
        "qwen-max": {
            "api_key": "sk-trbFwocx3hwvWWrS7eA4770d89564207Be2046F4956eA896",
            "base_url": "https://aihubmix.com/v1",
            "model": "qwen-max"
        }
    }
    return configs.get(model_name)

async def generate_questions_by_type(resume_text, question_type, count, model_name, jd_text=None):
    """根据类型生成面试问题 - 异步版本"""
    model_config = get_model_config(model_name)
    client = AsyncOpenAI(
        api_key=model_config['api_key'],
        base_url=model_config['base_url']
    )

    type_prompts = {
        'knowledge': f"""
        请生成{count}个针对性的技术知识题库面试问题。问题应该覆盖基础概念、原理理解等。

        简历内容: {resume_text}
        {'招聘JD: ' + jd_text if jd_text else ''}

        要求：
        1. 每个问题都要编号
        2. 问题应该考察核心技术概念和原理
        3. 难度要适中，有区分度
        4. 使用专业但清晰的语言
        """,
        'leetcode': f"""
        请生成{count}个算法编程面试问题，类似LeetCode风格。

        简历内容: {resume_text}
        {'招聘JD: ' + jd_text if jd_text else ''}

        要求：
        1. 每个问题都要编号
        2. 包含具体的问题描述和示例
        3. 难度要标注（简单/中等/困难）
        4. 问题类型多样（数组、字符串、动态规划等）
        """,
        'project': f"""
        请生成{count}个项目经验相关的面试问题。

        简历内容: {resume_text}
        {'招聘JD: ' + jd_text if jd_text else ''}

        要求：
        1. 每个问题都要编号
        2. 深入询问简历中提到的具体项目
        3. 关注技术选型、架构设计、问题解决等
        4. 考察项目经验的深度和广度
        """
    }

    try:
        response = await client.chat.completions.create(
            model=model_config['model'],
            messages=[
                {"role": "system", "content": "你是一位专业的技术面试官，请根据要求生成合适的面试问题。"},
                {"role": "user", "content": type_prompts[question_type]}
            ],
            temperature=0.7
        )

        questions = response.choices[0].message.content.strip().split('\n')
        questions = [q.strip() for q in questions if q.strip() and any(str(i) in q[:4] for i in range(1, count + 1))]
        return questions[:count]
    except Exception as e:
        # 出错时返回默认问题
        return [f"{i}. 示例{question_type}问题 {i}" for i in range(1, count + 1)]

async def evaluate_answer(question, answer, model_name, jd_text=None):
    """评估回答 - 异步版本"""
    try:
        model_config = get_model_config(model_name)

        # 判断问题类型
        is_self_intro = "自我介绍" in question and "教育背景" in question
        is_leetcode = "[LeetCode]" in question
        is_project = "[项目经验]" in question
        is_knowledge = "[题库]" in question

        if is_self_intro:
            prompt = f"""
            请评估以下自我介绍的回答。

            自我介绍要求：{question}
            回答: {answer}

            请按以下格式评估：
            分数：[X/10分]
            评价：[对表达清晰度、内容完整性、时间控制的评价]
            优点：[自我介绍中的亮点]
            建议：[改进建议]
            """
        elif is_leetcode:
            prompt = f"""
            请评估以下算法编程问题的回答。

            问题: {question}
            回答: {answer}

            请按以下格式评估：
            分数：[X/10分]
            评价：[对解题思路、时间复杂度、代码质量的评价]
            优化建议：[可能的优化方向]
            知识点：[涉及的算法知识点]
            """
        elif is_project:
            prompt = f"""
            请评估以下项目经验相关问题的回答。

            问题: {question}
            回答: {answer}
            {'招聘JD: ' + jd_text if jd_text else ''}

            请按以下格式评估：
            分数：[X/10分]
            评价：[对项目理解深度、技术选型、解决方案的评价]
            亮点：[回答中的亮点]
            建议：[改进建议]
            """
        else:  # 知识题库问题
            prompt = f"""
            请评估以下技术知识问题的回答。

            问题: {question}
            回答: {answer}

            请按以下格式评估：
            分数：[X/10分]
            评价：[对概念理解、专业深度的评价]
            正确点：[回答中的正确观点]
            补充：[需要补充的知识点]
            """

        client = AsyncOpenAI(
            api_key=model_config['api_key'],
            base_url=model_config['base_url']
        )

        response = await client.chat.completions.create(
            model=model_config['model'],
            messages=[
                {"role": "system",
                 "content": "你是一位专业的技术面试官，正在评估候选人的回答。请用中文提供专业、建设性的反馈。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )

        return response.choices[0].message.content
    except Exception as e:
        return f"分数：N/A\n评价：由于技术原因无法完成评估\n建议：请稍后重试"