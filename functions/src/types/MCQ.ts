export interface MCQ {
    statement: string
    options: { content: string, isCorrect: boolean }[]
    explanation: string
    difficulty: number//1-10
}