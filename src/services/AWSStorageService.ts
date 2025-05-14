import { DynamoDB, S3 } from 'aws-sdk';
import { ISurveyData, ISurveyRow } from '../types/survey';

export class AWSStorageService {
  private dynamoDB: DynamoDB.DocumentClient;
  private s3: S3;
  private readonly SURVEY_TABLE = process.env.SURVEY_TABLE || 'survey-data';
  private readonly SURVEY_BUCKET = process.env.SURVEY_BUCKET || 'survey-data-storage';
  private readonly CHUNK_SIZE = 1000;

  constructor() {
    this.dynamoDB = new DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.s3 = new S3({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  /**
   * Stores survey metadata in DynamoDB and raw data in S3
   */
  async storeSurveyData(data: ISurveyData): Promise<void> {
    const { id, metadata, data: rows } = data;
    
    // Store metadata in DynamoDB
    await this.dynamoDB.put({
      TableName: this.SURVEY_TABLE,
      Item: {
        id,
        ...metadata,
        createdAt: new Date().toISOString(),
        status: 'PROCESSING'
      }
    }).promise();

    // Store raw data in S3 in chunks
    const chunks = this.chunkArray(rows, this.CHUNK_SIZE);
    await Promise.all(chunks.map((chunk, index) => 
      this.s3.putObject({
        Bucket: this.SURVEY_BUCKET,
        Key: `${id}/chunk-${index}.json`,
        Body: JSON.stringify(chunk),
        ContentType: 'application/json'
      }).promise()
    ));

    // Update status in DynamoDB
    await this.dynamoDB.update({
      TableName: this.SURVEY_TABLE,
      Key: { id },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': 'COMPLETED' }
    }).promise();
  }

  /**
   * Retrieves survey data with pagination support
   */
  async getSurveyData(id: string, page: number = 1, pageSize: number = 100): Promise<{
    metadata: any,
    rows: ISurveyRow[],
    totalPages: number
  }> {
    // Get metadata from DynamoDB
    const { Item: metadata } = await this.dynamoDB.get({
      TableName: this.SURVEY_TABLE,
      Key: { id }
    }).promise();

    if (!metadata) {
      throw new Error('Survey not found');
    }

    // Calculate which chunk contains our page
    const chunkIndex = Math.floor((page - 1) * pageSize / this.CHUNK_SIZE);
    
    // Get chunk from S3
    const { Body } = await this.s3.getObject({
      Bucket: this.SURVEY_BUCKET,
      Key: `${id}/chunk-${chunkIndex}.json`
    }).promise();

    const chunk: ISurveyRow[] = JSON.parse(Body?.toString() || '[]');
    const startIndex = ((page - 1) * pageSize) % this.CHUNK_SIZE;
    const rows = chunk.slice(startIndex, startIndex + pageSize);

    return {
      metadata,
      rows,
      totalPages: Math.ceil(metadata.totalRows / pageSize)
    };
  }

  /**
   * Splits array into chunks for efficient storage
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Cleans up old data based on retention policy
   */
  async cleanupOldData(retentionDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { Items } = await this.dynamoDB.scan({
      TableName: this.SURVEY_TABLE,
      FilterExpression: '#date < :cutoff',
      ExpressionAttributeNames: { '#date': 'createdAt' },
      ExpressionAttributeValues: { ':cutoff': cutoffDate.toISOString() }
    }).promise();

    if (!Items) return;

    for (const item of Items) {
      // Delete from S3
      const listParams = {
        Bucket: this.SURVEY_BUCKET,
        Prefix: `${item.id}/`
      };
      
      const { Contents } = await this.s3.listObjects(listParams).promise();
      if (Contents) {
        await Promise.all(Contents.map(obj => 
          this.s3.deleteObject({
            Bucket: this.SURVEY_BUCKET,
            Key: obj.Key || ''
          }).promise()
        ));
      }

      // Delete from DynamoDB
      await this.dynamoDB.delete({
        TableName: this.SURVEY_TABLE,
        Key: { id: item.id }
      }).promise();
    }
  }
} 