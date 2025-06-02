import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化日期时间为可读字符串
 * @param date - 日期对象、时间戳或字符串
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(date: Date | number | string): string {
  let d: Date
  if (typeof date === 'string') {
    d = new Date(date)
  } else if (typeof date === 'number') {
    d = new Date(date)
  } else {
    d = date
  }
  
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
