import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    read_tasks: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0 },
      ],
      exec: 'readTasks',
    },
    write_tasks: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '10s', target: 0 },
      ],
      startTime: '55s',
      exec: 'writeTasks',
    },
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 500 },
        { duration: '60s', target: 500 },
        { duration: '15s', target: 0 },
      ],
      startTime: '110s',
      exec: 'readTasks',
    },
  },
  thresholds: {
    http_req_duration: ['avg<50', 'p(95)<200'],
    http_req_failed: ['rate<0.001'],
    errors: ['rate<0.001'],
  },
};

export function setup() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'manager@collab.com',
    password: 'password123',
  }), { headers: { 'Content-Type': 'application/json' } });

  const loginData = JSON.parse(loginRes.body);
  const authToken = loginData.data.accessToken;

  const projectRes = http.get(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const projectData = JSON.parse(projectRes.body);
  const projectId = projectData.data[0].id;

  return { authToken, projectId };
}

export function readTasks(data) {
  const res = http.get(`${BASE_URL}/api/projects/${data.projectId}/tasks?page=1&limit=20`, {
    headers: { Authorization: `Bearer ${data.authToken}` },
  });

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  errorRate.add(!success);
  sleep(0.1);
}

export function writeTasks(data) {
  const statuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

  const listRes = http.get(`${BASE_URL}/api/projects/${data.projectId}/tasks?limit=1`, {
    headers: { Authorization: `Bearer ${data.authToken}` },
  });

  if (listRes.status === 200) {
    const tasks = JSON.parse(listRes.body).data;
    if (tasks.length > 0) {
      const res = http.patch(`${BASE_URL}/api/tasks/${tasks[0].id}/status`, JSON.stringify({
        status: randomStatus,
      }), {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.authToken}`,
        },
      });

      const success = check(res, { 'status change ok': (r) => r.status === 200 });
      errorRate.add(!success);
    }
  }
  sleep(0.5);
}
