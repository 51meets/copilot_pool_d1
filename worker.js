// 定义路由
const routes = {
	// 邀请Github用户
	'POST:/inviteUser': inviteUserHandle,
	// 上传
	'POST:/upload': uploadHandle,
	// 贡献榜
	'GET:/contribution/list': contributionListHandle,
	// AI对话
	'POST:/v1/chat/completions': chatCompletionsHandle
};

// 全局请求头设置
const global_headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
	'Access-Control-Allow-Headers': '*'
};


// 定义接受消息用户
const user = '';
// 定义telegram机器人的token
const telegramToken = '';
// 是否开启Telegram消息通知
const isTelegram = true;

// 处理请求
async function handleRequest(env, request) {
	// 预检请求
	if (request.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: global_headers });
	}

	// 分发请求
	const { pathname } = new URL(request.url);
	const method = request.method;
	const key = `${method}:${pathname}`;
	const handler = routes[key] || notFoundHandler;
	return handler(env, request);
}

/**
 * 邀请Github用户
 * @param env
 * @param request
 * @returns {Promise<void>}
 */
async function inviteUserHandle(env, request) {
	// 获取请求参数
	const email = (new URL(request.url)).searchParams.get('email');
	// 校验参数
	if (!isEmpty(email) && isEmail(email)) {
		// 定义邀请邮件未发送状态
		let status = false;
		// 查询组织信息
		const { results } = await env.DB.prepare('select * from organization').run();
		if (results.length > 0) {
			for (const item of results) {
				// 判断当前组织是否存活三天以上
				const now = new Date().getTime();
				const createDate = new Date(item.create_date).getTime();
				if ((now - createDate) < 259200000) {
					continue;
				}
				// 发送邀请邮件
				const response = await sendEmail(email, item.name, item.token);
				if (response.status === 201) {
					status = true;
					// 结束循环
					break;
				} else {
					// 消息通知
					await telegramMessage(`邀请邮件发送失败，请检查组织 ${item.name} 是否已达邀请上限`);
				}
			}
			if (!status) {
				// 消息通知
				await telegramMessage('邀请邮件发送失败，请检查组织是否已达邀请上限');
				return await error(500, '邀请邮件发送失败,请联系管理员。');
			}
		} else {
			// 消息通知
			await telegramMessage('目前暂无组织信息，请先创建组织');
			return await error(500, '暂无组织,请联系管理员。');
		}
		return await success('邀请邮件已发送。', null);
	} else {
		return await error(400, '无效邮箱。');
	}
}

/**
 * 上传
 * @param env
 * @param request
 * @returns {Promise<void>}
 */
async function uploadHandle(env, request) {
	// 获取请求参数
	const params = await request.json();
	// 成功上传的token数量
	let successCount = 0;
	// 失败上传的token数量
	let failCount = 0;
	// 错误消息
	let errorMessage = '无效的Token：';
	switch (params.type) {
		// 用户
		case 'user':
			// 获取请求参数
			if (params.token.length > 0) {
				for (const token of params.token) {
					// 校验参数
					if (!isEmpty(token) && token.startsWith('ghu')) {
						// 验证token是否有效
						const response = await checkGhuStatus(token);
						if (response.status === 200) {
							// 检查是否重复上传
							const count = await env.DB.prepare('select count(1) AS total from ghu_pool where token = ?1')
								.bind(token).first('total');
							if (count === 0) {
								successCount++;
								// 处理贡献榜
								await handleContributionTotal(env, params.user);
								// 保存token
								await env.DB.prepare('insert into ghu_pool (token) values (?1)').bind(token).run();
							}
						} else {
							failCount++;
							errorMessage += `${token} |`;
						}
					} else {
						failCount++;
						errorMessage += `${token} |`;
					}
				}
			} else {
				return await error(400, '无效的参数。');
			}
			break;
		// 组织
		case 'organization':
			// 校验参数
			if (!isEmpty(params.name) && params.token.length > 0) {
				for (const token of params.token) {
					if (token.startsWith('ghp')) {
						// 验证token是否有效
						const response = await checkGhpStatus(params.name, token);
						if (response.status === 200) {
							// 校验是否重复上传
							const count = await env.DB.prepare('select count(1) AS total from organization where name = ?1')
								.bind(params.name).first('total');
							if (count === 0) {
								// 判断是否开启Copilot权限
								if (await checkCopilotStatus(params.name, token)) {
									successCount++;
									// 处理贡献榜
									await handleContributionTotal(env, params.user);
									// 保存组织信息
									await env.DB
										.prepare('insert into organization (name, token) values (?1, ?2)')
										.bind(params.name, token)
										.run();
								} else {
									failCount++;
									errorMessage += `${params.name}未开启Copilot权限。 |`;
								}
							}
						} else {
							failCount++;
							errorMessage += `${token} |`;
						}
					} else {
						failCount++;
						errorMessage += `${token} |`;
					}
				}
			} else {
				return error(400, '无效的参数。');
			}
			break;
		default:
			break;
	}
	errorMessage = errorMessage.substring(0, errorMessage.length - 1);
	return await success(`成功上传：${successCount}个，上传失败：${failCount}个，${errorMessage}`, null);
}

/**
 * 贡献榜
 * @param env
 * @param request
 * @returns {Promise<void>}
 */
async function contributionListHandle(env, request) {
	const { results } = await env.DB.prepare('select * from contribution order by total desc LIMIT 10').run();
	return await success('查询成功', results);
}

/**
 * AI对话
 * @param env
 * @param request
 * @returns {Promise<Response>}
 */
async function chatCompletionsHandle(env, request) {
	// 请求密钥
	let authorization = '';
	// 获取请求头类型
	const userAuthorization = request.headers.get('Authorization');
	switch (userAuthorization) {
		// 使用密钥池
		case 'Bearer ghu_pool':
			// 获取所有密钥池
			const { results } = await env.DB.prepare('select * from ghu_pool').run();
			if (results.length === 0) {
				return new Response(JSON.stringify({ message: 'No keys' }), {
					status: 500
				});
			}
			// 随机获取一个密钥
			const token = results[Math.floor(Math.random() * results.length)].token;
			authorization = `Bearer ${token}`;
			break;
		// 使用用户密钥
		default:
			authorization = userAuthorization;
			break;
	}
	// 发送请求
	const response = await fetch(`https://proxy.cocopilot.org/v1/chat/completions`, {
		method: 'POST', headers: {
			'Content-Type': 'application/json', Authorization: authorization
		}, body: request.body
	});
	// 对跨域结果作处理
	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Headers', '*');
	headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
	return new Response(response.body, {
		status: response.status, headers: headers
	});
}

/**
 * 发送telegram消息
 * @param message 消息内容
 * @returns {Promise<void>}
 */
async function telegramMessage(message) {
	if (isTelegram) {
		await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
			method: 'POST', headers: {
				'Content-Type': 'application/json'
			}, body: JSON.stringify({
				chat_id: user, text: message
			})
		});
	}
}

/**
 * 发送GitHub邀请邮件
 * @param email 邮箱
 * @param orgName 组织名称
 * @param orgToken 组织Token
 * @returns {Promise<Response>}
 */
async function sendEmail(email, orgName, orgToken) {
	return await fetch(`https://api.github.com/orgs/${orgName}/invitations`, {
		method: 'POST', headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'Authorization': `Bearer ${orgToken}`,
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
		}, body: JSON.stringify({
			email: email, role: 'direct_member'
		})
	});
}

/**
 * 检查GitHub用户状态
 * @param token
 * @returns {Promise<Response>}
 */
async function checkGhuStatus(token) {
	return await fetch('https://api.github.com/copilot_internal/v2/token', {
		method: 'GET', headers: {
			'Authorization': `Bearer ${token}`,
			'Host': 'api.github.com',
			'Accept': '*/*',
			'Editor-Version': 'vscode/1.86.2',
			'Editor-Plugin-Version': 'copilot/1.171.0',
			'User-Agent': 'GithubCopilot/1.171.0',
			'Accept-Encoding': 'gzip,deflate,br'
		}
	});
}

/**
 * 检查GitHub组织状态
 * @param name
 * @param token
 * @returns {Promise<Response>}
 */
async function checkGhpStatus(name, token) {
	return await fetch(`https://api.github.com/orgs/${name}/members`, {
		method: 'GET', headers: {
			'Authorization': `Bearer ${token}`,
			'Accept': 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
		}
	});
}

/**
 * 检查Copilot状态
 * @param name
 * @param token
 * @returns {Promise<boolean>}
 */
async function checkCopilotStatus(name, token) {
	const response = await fetch(`https://api.github.com/orgs/${name}/copilot/billing`, {
		method: 'GET', headers: {
			'Authorization': `Bearer ${token}`,
			'Accept': 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
		}
	});
	if (response.status === 200) {
		// 获取响应结果
		await response.json().then(
			(data) => {
				return 'enabled' === data.ide_chat;
			}
		);
	}
	return false;
}


/**
 * 处理贡献榜
 * @param name
 * @returns {Promise<void>}
 */
async function handleContributionTotal(env, name) {
	let contributionTotal = 1;
	// 贡献榜
	const { results } = await env.DB.prepare('select * from contribution where name = ?1 limit 1')
		.bind(name)
		.run();
	if (results.length > 0) {
		contributionTotal = results[0].total + 1;
		// 更新贡献榜信息
		await env.DB
			.prepare('update contribution set total = ?1 where name = ?2')
			.bind(contributionTotal, name)
			.run();
	} else {
		// 保存贡献榜信息
		await env.DB
			.prepare('insert into contribution (name, total) values (?1, ?2)')
			.bind(name, contributionTotal)
			.run();
	}
}

/**
 * 定时任务
 * @param env
 * @returns {Promise<void>}
 */
async function doSomeTaskOnASchedule(env) {
	console.log('定时任务开始');
	await checkGhuPoolStatus(env);
	await checkGhpPoolStatus(env);
}

/**
 * 检查密钥池状态
 * @param env
 * @returns {Promise<void>}
 */
async function checkGhuPoolStatus(env) {
	// 获取所有密钥
	const { results } = await env.DB.prepare('select * from ghu_pool').run();
	if (results.length === 0) {
		// 消息通知
		await telegramMessage('密钥池为空，请及时补充密钥');
	}
	const statusChecks = results.map(result => checkGhuStatus(result.token));
	const responses = await Promise.all(statusChecks);
	// 处理每个检查的结果
	for (const response of responses) {
		const index = responses.indexOf(response);
		if (response.status !== 200) {
			await env.DB.prepare('delete from ghu_pool where token = ?1').bind(results[index].token).run();
		}
	}
}

/**
 * 检查组织池状态
 * @param env
 * @returns {Promise<void>}
 */
async function checkGhpPoolStatus(env) {
	// 获取所有密钥
	const { results } = await env.DB.prepare('select * from organization').all();
	if (results.length === 0) {
		// 消息通知
		await telegramMessage('组织池为空，请及时补充密钥');
	}
	const statusChecks = results.map(result => checkGhpStatus(result.name, result.token));
	const responses = await Promise.all(statusChecks);
	// 处理每个检查的结果
	for (const response of responses) {
		const index = responses.indexOf(response);
		if (response.status !== 200) {
			await env.DB.prepare('delete from organization where name = ?1').bind(results[index].name).run();
		}
	}
}

/**
 * 返回成功
 * @param message
 * @param data
 * @returns {Promise<*>}
 */
async function success(message, data) {
	return Response.json({ code: 200, message: message, data: data }, {
		status: 200,
		headers: global_headers
	});
}

/**
 * 返回错误
 * @param message
 * @returns {Promise<*>}
 */
async function error(code, message) {
	return Response.json({ code: code, message: message }, {
		status: code,
		headers: global_headers
	});
}

/**
 * 校验字符串是否为空
 * @param str
 * @returns {boolean}
 */
function isEmpty(str) {
	return (!str || str.length === 0);
}

/**
 * 校验是否为有效的邮件格式
 * @param str
 * @returns {boolean}
 */
function isEmail(str) {
	// 此处的正则表达式用于校验邮件格式
	let emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
	return emailPattern.test(str);
}

/**
 * 未找到资源处理
 * @param env
 * @param request
 * @returns {Promise<Response>}
 */
async function notFoundHandler(env, request) {
	return Response.json({ message: '资源不存在', code: 404 }, { status: 404 });
}

export default {
	// 请求入口
	async fetch(request, env, ctx) {
		return handleRequest(env, request);
	},
	// 定时任务
	async scheduled(event, env, ctx) {
		ctx.waitUntil(doSomeTaskOnASchedule(env));
	}
};
