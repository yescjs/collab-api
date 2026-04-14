import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    stable_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '10s', target: 100 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0 },
      ],
      exec: 'readTasks',
    },
  },
  thresholds: {
    http_req_duration: ['avg<500', 'p(95)<2000'],
    http_req_failed: ['rate<0.05'],
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
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!success);
  sleep(0.5);
}
