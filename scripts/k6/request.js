// docker-compose run k6 run /scripts/k6/request.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
    stages: [
        { duration: '3m', target: 500 },  // 3분 동안 500명까지 증가
        { duration: '5m', target: 1000 },  // 5분 동안 1000명까지 증가
        { duration: '5m', target: 1000 },  // 5분 동안 1000명 유지
        { duration: '2m', target: 0 },    // 2분 동안 0명으로 감소
    ],
};

export default function () {
    // 1~10,000,000 사이의 랜덤 주문아이디 생성
    const orderId = Math.floor(Math.random() * 1000000) + 1; // 1000000
    
    const params = {
        headers: {'x-bypass-token': 'happy-world-token'},
        tags: { 
            api_endpoint: 'order_api',
            test_type: 'order_api',
            name: 'order_request'
        } // 개별 ID 대신 경로로 그룹화
    };
    const response = http.get(
        `http://host.docker.internal:3000/order/${orderId}`,
        params
    );
    
    // 응답 검증
    check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 2000ms': (r) => r.timings.duration < 2000,
    });
}