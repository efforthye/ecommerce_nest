import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Admin } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit {
  private admin: Admin;

  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly client: ClientKafka
  ) {}

  async onModuleInit() {
    await this.client.connect();
    this.admin = (this.client as any).client.admin();
  }

  async createTopicIfNotExists(topic: string) {
    try {
      const topics = await this.admin.listTopics();
      if (!topics.includes(topic)) {
        await this.admin.createTopics({
          topics: [{
            topic,
            numPartitions: 3,
            replicationFactor: 3
          }]
        });
        console.log(`Topic ${topic} created successfully`);
      }
    } catch (error) {
      console.error(`Error creating topic ${topic}:`, error);
      throw error;
    }
  }

  async emit(topic: string, message: any) {
    return this.client.emit(topic, {
      ...message,
      timestamp: new Date().toISOString()
    });
  }
}