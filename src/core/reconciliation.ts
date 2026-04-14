import type { MyOrder } from '../private-api.js'

export function isActiveOrder(order: MyOrder): boolean {
  return order.status === 'open' || order.status === 'partial'
}

export function isOpenOrder(order: MyOrder): boolean {
  return order.status === 'open'
}

export function isPartialOrder(order: MyOrder): boolean {
  return order.status === 'partial'
}

export function isBuyOrder(order: MyOrder): boolean {
  return order.side === 'buy'
}

export function getActiveOrders(orders: MyOrder[]): MyOrder[] {
  return orders.filter(isActiveOrder)
}

export function getActiveBuyOrders(orders: MyOrder[]): MyOrder[] {
  return orders.filter((order) => isBuyOrder(order) && isActiveOrder(order))
}

export function getOpenBuyOrders(orders: MyOrder[]): MyOrder[] {
  return orders.filter((order) => isBuyOrder(order) && isOpenOrder(order))
}

export function getPartialBuyOrders(orders: MyOrder[]): MyOrder[] {
  return orders.filter((order) => isBuyOrder(order) && isPartialOrder(order))
}

export function findActiveBuyOrder(orders: MyOrder[]): MyOrder | undefined {
  return getActiveBuyOrders(orders)[0]
}

export function findOrderById(
  orders: MyOrder[],
  orderId: number
): MyOrder | undefined {
  return orders.find((order) => order.id === orderId)
}