// docker-compose run k6 run /scripts/k6/request.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
    stages: [
        { duration: '3m', target: 500 },    // 처음 3분간 500명까지 점진적 증가
        { duration: '5m', target: 1000 },   // 다음 5분간 1000명까지 증가
        { duration: '5m', target: 1000 },   // 5분간 1000명 유지
        { duration: '2m', target: 0 },      // 마지막 2분간 0명으로 감소
    ],
};

export default function () {
    const orderId = Math.floor(Math.random() * 10000000) + 1;
    
    const params = {
        headers: {
            'x-bypass-token': 'happy-world-token'
        }
    };

    const response = http.get(
        `http://host.docker.internal:3000/order/${orderId}`,
        params
    );
    
    check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 2000ms': (r) => r.timings.duration < 2000,
    });
}