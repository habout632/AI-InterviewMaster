document.addEventListener('DOMContentLoaded', function() {
    // API地址
    const API_BASE_URL = 'http://localhost:5000/api';

    // 状态变量
    let interviewId = null;
    let questions = [];
    let currentQuestionIndex = 0;
    let timerInterval = null;
    let interviewStartTime = null;
    let interviewTimeLimit = null;
    let interviewHistory = [];

    // 页面元素
    const resumeUpload = document.getElementById('resumeUpload');
    const jdText = document.getElementById('jdText');
    const startInterviewBtn = document.getElementById('startInterviewBtn');
    const uploadSection = document.getElementById('uploadSection');
    const interviewSection = document.getElementById('interviewSection');
    const timerElement = document.getElementById('timer');
    const progressBar = document.querySelector('.progress-bar');
    const questionTitle = document.getElementById('questionTitle');
    const questionContent = document.getElementById('questionContent');
    const answerText = document.getElementById('answerText');
    const submitAnswerBtn = document.getElementById('submitAnswerBtn');
    const feedbackArea = document.getElementById('feedbackArea');
    const feedbackContent = document.getElementById('feedbackContent');
    const nextQuestionBtn = document.getElementById('nextQuestionBtn');
    const viewSummaryBtn = document.getElementById('viewSummaryBtn');
    const summaryArea = document.getElementById('summaryArea');
    const summaryContent = document.getElementById('summaryContent');
    const startNewInterviewBtn = document.getElementById('startNewInterviewBtn');
    const interviewCount = document.getElementById('interviewCount');
    const interviewHistoryElement = document.getElementById('interviewHistory');

    // 配置元素
    const includeSelfIntro = document.getElementById('includeSelfIntro');
    const typeKnowledge = document.getElementById('typeKnowledge');
    const typeLeetcode = document.getElementById('typeLeetcode');
    const typeProject = document.getElementById('typeProject');
    const typeKnowledgeValue = document.getElementById('typeKnowledgeValue');
    const typeLeetcodeValue = document.getElementById('typeLeetcodeValue');
    const typeProjectValue = document.getElementById('typeProjectValue');
    const questionCount = document.getElementById('questionCount');
    const questionCountValue = document.getElementById('questionCountValue');
    const timeLimit = document.getElementById('timeLimit');
    const modelSelect = document.getElementById('modelSelect');
    const configPreview = document.getElementById('configPreview');

    let recognition = null;
let isRecording = false;

    // 初始化
    function init() {
        // 当简历上传后启用开始按钮
        resumeUpload.addEventListener('change', function() {
            startInterviewBtn.disabled = !this.files.length;
        });

            // 初始化所有工具提示
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => {
        new bootstrap.Tooltip(tooltip);
    });

        // 添加语音输入按钮事件
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    if(voiceInputBtn) {
        voiceInputBtn.addEventListener('click', toggleSpeechRecognition);
    }


        // 开始面试按钮
        startInterviewBtn.addEventListener('click', createAndStartInterview);

        // 提交答案按钮
        submitAnswerBtn.addEventListener('click', submitAnswer);

        // 下一题按钮
        nextQuestionBtn.addEventListener('click', showNextQuestion);

        // 查看总结按钮
        viewSummaryBtn.addEventListener('click', showSummary);

        // 开始新面试按钮
        startNewInterviewBtn.addEventListener('click', resetInterview);

        // 更新类型百分比显示
        typeKnowledge.addEventListener('input', updateTypeValues);
        typeLeetcode.addEventListener('input', updateTypeValues);
        typeProject.addEventListener('input', updateTypeValues);
        questionCount.addEventListener('input', updateQuestionCount);

        // 初始化值
        updateTypeValues();
        updateQuestionCount();
    }

    // 更新类型值显示
    function updateTypeValues() {
        typeKnowledgeValue.textContent = typeKnowledge.value + '%';
        typeLeetcodeValue.textContent = typeLeetcode.value + '%';
        typeProjectValue.textContent = typeProject.value + '%';
        updateConfigPreview();
    }

    // 更新问题数量显示
    function updateQuestionCount() {
        questionCountValue.textContent = questionCount.value + '题';
        updateConfigPreview();
    }

    // 更新配置预览
    function updateConfigPreview() {
        const totalPercentage = parseInt(typeKnowledge.value) + parseInt(typeLeetcode.value) + parseInt(typeProject.value);

        if (totalPercentage > 0) {
            const knowledgeQuestions = Math.round(questionCount.value * parseInt(typeKnowledge.value) / totalPercentage);
            const leetcodeQuestions = Math.round(questionCount.value * parseInt(typeLeetcode.value) / totalPercentage);
            const projectQuestions = Math.round(questionCount.value * parseInt(typeProject.value) / totalPercentage);

            let html = '';
            if (parseInt(typeKnowledge.value) > 0) {
                html += `<div class="type-percentage">题库: ${knowledgeQuestions}题 (${typeKnowledge.value}%)</div>`;
            }
            if (parseInt(typeLeetcode.value) > 0) {
                html += `<div class="type-percentage">LeetCode: ${leetcodeQuestions}题 (${typeLeetcode.value}%)</div>`;
            }
            if (parseInt(typeProject.value) > 0) {
                html += `<div class="type-percentage">项目经验: ${projectQuestions}题 (${typeProject.value}%)</div>`;
            }

            if (totalPercentage > 100) {
                html += `<div class="text-warning mt-2">注意：总占比超过100%，系统会按比例自动调整</div>`;
            }

            configPreview.innerHTML = html;
        } else {
            configPreview.innerHTML = '<div class="text-warning">请至少设置一种问题类型的占比大于0</div>';
        }
    }

    // 创建并开始面试
    async function createAndStartInterview() {
        try {
            // 创建面试
            const createResponse = await fetch(`${API_BASE_URL}/interview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    include_self_intro: includeSelfIntro.checked,
                    question_count: parseInt(questionCount.value),
                    time_limit: parseInt(timeLimit.value),
                    selected_model: modelSelect.value,
                    interview_types: {
                        'knowledge': {'name': '题库', 'percentage': parseInt(typeKnowledge.value)},
                        'leetcode': {'name': 'LeetCode', 'percentage': parseInt(typeLeetcode.value)},
                        'project': {'name': '项目经验', 'percentage': parseInt(typeProject.value)}
                    }
                })
            });

            const createData = await createResponse.json();
            interviewId = createData.id;

            // 上传简历
            const formData = new FormData();
            formData.append('resume', resumeUpload.files[0]);
            if (jdText.value.trim()) {
                formData.append('jd_text', jdText.value.trim());
            }

            const uploadResponse = await fetch(`${API_BASE_URL}/interview/${interviewId}/upload`, {
                method: 'POST',
                body: formData
            });

            const uploadData = await uploadResponse.json();

            if (uploadData.error) {
                throw new Error(uploadData.error);
            }

            // 启动面试UI
            questions = uploadData.questions;
            interviewStartTime = uploadData.start_time;
            interviewTimeLimit = uploadData.time_limit * 60; // 转换为秒

            // 显示面试部分
            uploadSection.classList.add('hidden');
            interviewSection.classList.remove('hidden');
            timerElement.classList.remove('hidden');

            // 启动计时器
            startTimer();

            // 显示第一个问题
            showCurrentQuestion();
        } catch (error) {
            alert('启动面试出错: ' + error.message);
        }
    }

    // 启动计时器
    function startTimer() {
        const endTime = interviewStartTime + interviewTimeLimit;

        timerInterval = setInterval(() => {
            const currentTime = Math.floor(Date.now() / 1000);
            const remainingTime = Math.max(0, endTime - currentTime);

            // 更新计时器显示
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            timerElement.innerHTML = `剩余时间: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // 少于5分钟时添加警告样式
            if (remainingTime < 300) {
                timerElement.classList.add('warning');
            }

            // 处理超时
            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                if (!feedbackArea.classList.contains('hidden')) {
                    return; // 已经显示反馈
                }

                // 自动提交当前答案
                alert('面试时间已到！系统将自动提交当前答案。');
                submitAnswer();
            }
        }, 1000);
    }

    // 显示当前问题
    function showCurrentQuestion() {
        // 重置UI
        feedbackArea.classList.add('hidden');
        nextQuestionBtn.classList.add('hidden');
        viewSummaryBtn.classList.add('hidden');
        answerText.value = '';

        // 更新进度条
        const progress = (currentQuestionIndex / questions.length) * 100;
        progressBar.style.width = `${progress}%`;

        // 获取当前问题
        const currentQuestion = questions[currentQuestionIndex];

        // 设置问题标题和内容
        if (includeSelfIntro.checked && currentQuestionIndex === 0) {
            questionTitle.textContent = '自我介绍';
        } else {
            const actualQuestionNum = currentQuestionIndex - (includeSelfIntro.checked ? 1 : 0);
            questionTitle.textContent = `问题 ${actualQuestionNum + 1}/${questionCount.value}`;
        }

        questionContent.textContent = currentQuestion;
    }

    // 提交答案
    async function submitAnswer() {
        if (!answerText.value.trim()) {
            alert('请先输入您的回答再提交');
            return;
        }

        try {
            submitAnswerBtn.disabled = true;
            const response = await fetch(`${API_BASE_URL}/interview/${interviewId}/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    answer: answerText.value
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // 显示反馈
            feedbackArea.classList.remove('hidden');
            feedbackContent.innerHTML = data.feedback.replace(/\n/g, '<br>');

            // 显示适当的按钮
            if (data.is_completed) {
                viewSummaryBtn.classList.remove('hidden');
                if (data.summary) {
                    // 保存总结以供稍后使用
                    interviewSummary = data.summary;
                }
            } else {
                nextQuestionBtn.classList.remove('hidden');
            }

            // 更新当前问题索引
            currentQuestionIndex = data.current_question;
        } catch (error) {
            alert('提交答案出错: ' + error.message);
        } finally {
            submitAnswerBtn.disabled = false;
        }
    }

    // 显示下一个问题
    function showNextQuestion() {
        showCurrentQuestion();
    }

    // 显示总结
    function showSummary() {
        // 获取面试总结
        fetch(`${API_BASE_URL}/interview/${interviewId}/summary`)
            .then(response => response.json())
            .then(summary => {
                // 隐藏其他部分
                feedbackArea.classList.add('hidden');

                // 显示总结区域
                summaryArea.classList.remove('hidden');

                // 构建总结内容
                let summaryHtml = `
                    <p>使用模型: ${summary.model}</p>
                    <p>问题数量: ${summary.total_questions}题</p>
                    
                    <h4 class="mt-4">问题类型分布</h4>
                `;

                // 显示类型分布
                for (const [typeKey, typeInfo] of Object.entries(summary.interview_types)) {
                    if (typeInfo.percentage > 0) {
                        summaryHtml += `<p>${typeInfo.name}: ${typeInfo.percentage}%</p>`;
                    }
                }

                // 计算各类型得分
                const typeScores = {};

                for (let i = 0; i < summary.questions.length; i++) {
                    const question = summary.questions[i];
                    const score = summary.question_scores[i];

                    // 从问题中提取类型
                    for (const [typeKey, typeInfo] of Object.entries(summary.interview_types)) {
                        if (question.includes(`[${typeInfo.name}]`)) {
                            if (!typeScores[typeKey]) {
                                typeScores[typeKey] = { total: 0, count: 0 };
                            }
                            typeScores[typeKey].total += score;
                            typeScores[typeKey].count += 1;
                            break;
                        }
                    }
                }

                // 显示各类型得分
                summaryHtml += `<h4 class="mt-4">各类型得分分析</h4>`;
                for (const [typeKey, scores] of Object.entries(typeScores)) {
                    if (scores.count > 0) {
                        const typeName = summary.interview_types[typeKey].name;
                        const avgScore = scores.total / scores.count;
                        summaryHtml += `<p>${typeName}: ${avgScore.toFixed(1)}/10</p>`;
                    }
                }

                // 问题和反馈详情
                summaryHtml += `<h4 class="mt-4">详细问答回顾</h4>`;
                for (let i = 0; i < summary.questions.length; i++) {
                    if (summary.include_self_intro && i === 0) {
                        summaryHtml += `<div class="mt-3"><strong>自我介绍:</strong></div>`;
                    } else {
                        summaryHtml += `<div class="mt-3"><strong>问题 ${i - (summary.include_self_intro ? 1 : 0) + 1}:</strong></div>`;
                    }
                    summaryHtml += `<p>${summary.questions[i]}</p>`;
                    summaryHtml += `<div><strong>反馈:</strong></div>`;
                    summaryHtml += `<p>${summary.feedbacks[i].replace(/\n/g, '<br>')}</p>`;
                    summaryHtml += `<hr>`;
                }

                // 总体评分
                summaryHtml += `
                    <h4 class="mt-4">总体评分</h4>
                    <p>总分：${summary.total_score}/${summary.total_questions * 10}</p>
                    <p>平均分：${summary.average_score.toFixed(1)}/10</p>
                `;

                summaryContent.innerHTML = summaryHtml;

                // 更新面试历史
                interviewHistory.unshift(summary);
                interviewCount.textContent = interviewHistory.length;
                updateInterviewHistory();

                // 停止计时器
                clearInterval(timerInterval);
                timerElement.classList.add('hidden');
            })
            .catch(error => {
                alert('获取面试总结出错: ' + error.message);
            });
    }

    // 重置面试
    function resetInterview() {
        // 清除状态
        interviewId = null;
        questions = [];
        currentQuestionIndex = 0;
        clearInterval(timerInterval);

        // 重置UI
        resumeUpload.value = '';
        jdText.value = '';
        startInterviewBtn.disabled = true;
        uploadSection.classList.remove('hidden');
        interviewSection.classList.add('hidden');
        summaryArea.classList.add('hidden');
        feedbackArea.classList.add('hidden');
        timerElement.classList.add('hidden');
    }

    // 更新面试历史记录显示
    function updateInterviewHistory() {
        if (interviewHistory.length === 0) {
            interviewHistoryElement.innerHTML = '<p>暂无面试记录</p>';
            return;
        }

        let historyHtml = '';
        for (let i = 0; i < interviewHistory.length; i++) {
            const interview = interviewHistory[i];
            historyHtml += `
                <div class="card mb-2">
                    <div class="card-body p-3">
                        <h6>面试 #${i + 1} - ${interview.date}</h6>
                        <p class="mb-1 small">总分: ${interview.total_score}/${interview.total_questions * 10}</p>
                        <p class="mb-1 small">平均分: ${interview.average_score.toFixed(1)}/10</p>
                        <p class="mb-1 small">时长: ${interview.duration}分钟</p>
                        <p class="mb-0 small">问题数量: ${interview.total_questions}题</p>
                    </div>
                </div>
            `;
        }

        interviewHistoryElement.innerHTML = historyHtml;
    }

    // 添加语音识别相关函数
function toggleSpeechRecognition() {
    if (isRecording) {
        stopSpeechRecognition();
    } else {
        startSpeechRecognition();
    }
}

function startSpeechRecognition() {
    // 检查浏览器支持
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('您的浏览器不支持语音识别功能，请使用Chrome浏览器或其他现代浏览器。');
        return;
    }

    // 创建语音识别对象
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

    // 配置
    recognition.lang = 'zh-CN';  // 设置语言为中文
    recognition.continuous = true;  // 持续听取，不会自动停止
    recognition.interimResults = true;  // 获取临时结果

    // 结果处理
    recognition.onresult = function(event) {
        let interimTranscript = '';
        let finalTranscript = '';

        // 处理识别结果
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        // 更新文本框
        const answerText = document.getElementById('answerText');
        let currentText = answerText.value || '';

        if (finalTranscript) {
            // 移除之前的临时文本（如果有）
            currentText = currentText.replace(/\[.+?\]$/, '').trim();

            // 添加最终识别结果
            if (currentText) {
                currentText += ' ' + finalTranscript;
            } else {
                currentText = finalTranscript;
            }

            answerText.value = currentText;
        } else if (interimTranscript) {
            // 显示临时识别结果
            currentText = currentText.replace(/\[.+?\]$/, '').trim();
            answerText.value = currentText + (currentText ? ' ' : '') + '[' + interimTranscript + ']';
        }
    };

    // 错误处理
    recognition.onerror = function(event) {
        console.error('语音识别错误:', event.error);
        stopSpeechRecognition();

        if (event.error === 'not-allowed') {
            alert('无法访问麦克风，请检查浏览器权限设置。');
        } else {
            alert('语音识别出错: ' + event.error);
        }
    };

    // 结束处理
    recognition.onend = function() {
        if (isRecording) {
            // 自动重新开始（意外结束时）
            recognition.start();
        } else {
            updateRecordingUI(false);
        }
    };

    // 开始识别
    try {
        recognition.start();
        isRecording = true;
        updateRecordingUI(true);
    } catch (e) {
        console.error('启动语音识别失败:', e);
        alert('启动语音识别失败: ' + e.message);
    }
}

function stopSpeechRecognition() {
    if (recognition) {
        recognition.stop();
        isRecording = false;
        updateRecordingUI(false);

        // 移除临时结果
        const answerText = document.getElementById('answerText');
        answerText.value = answerText.value.replace(/\[.+?\]$/, '').trim();
    }
}

function updateRecordingUI(isRecording) {
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    const recordingStatus = document.getElementById('recordingStatus');

    if (isRecording) {
        voiceInputBtn.classList.replace('btn-outline-primary', 'btn-danger');
        voiceInputBtn.innerHTML = '<i class="bi bi-stop-fill"></i>';
        voiceInputBtn.title = '停止语音输入';
        recordingStatus.style.display = 'block';
    } else {
        voiceInputBtn.classList.replace('btn-danger', 'btn-outline-primary');
        voiceInputBtn.innerHTML = '<i class="bi bi-mic-fill"></i>';
        voiceInputBtn.title = '开始语音输入';
        recordingStatus.style.display = 'none';
    }
}

    // 初始化应用
    init();
});