import { Module, Global, OnModuleInit } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaService } from './kafka.service';
import { Partitioners } from 'kafkajs';

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'ecommerce-app',
            brokers: ['localhost:9092', 'localhost:9093', 'localhost:9094']
          },
          consumer: {
            groupId: 'ecommerce-consumer-group'
          },
          producer: {
            createPartitioner: Partitioners.LegacyPartitioner,
            allowAutoTopicCreation: true
          }
        }
      }
    ])
  ],
  providers: [KafkaService],
  exports: [KafkaService]
})
export class KafkaModule implements OnModuleInit {
  constructor(private readonly kafkaService: KafkaService) {}

  async onModuleInit() {
    // 필요한 토픽들 생성
    const topics = ['order.created', 'order.status.updated'];
    for (const topic of topics) {
      try {
        await this.kafkaService.createTopicIfNotExists(topic);
      } catch (error) {
        console.error(`Failed to create topic ${topic}:`, error);
      }
    }
  }
}