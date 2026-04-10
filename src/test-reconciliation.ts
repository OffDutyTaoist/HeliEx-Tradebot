import {
  getActiveBuyOrders,
  getOpenBuyOrders,
  getPartialBuyOrders,
  findActiveBuyOrder,
  findOrderById,
} from './reconciliation.js'
import type { MyOrder } from './private-api.js'

function printSection(title: string, value: unknown) {
  console.log(`\n--- ${title} ---`)
  console.dir(value, { depth: null })
}

function main(): void {
  const mockOrders: MyOrder[] = [
    {
      id: 101,
      side: 'buy',
      price: '0.30000000',
      amount: '0.10000000',
      remaining: '0E-8',
      status: 'cancelled',
      created_at: '2026-04-08T23:51:01.007726',
    },
    {
      id: 102,
      side: 'buy',
      price: '0.50000001',
      amount: '0.10000000',
      remaining: '0.10000000',
      status: 'open',
      created_at: '2026-04-10T10:00:00.000000',
    },
    {
      id: 103,
      side: 'buy',
      price: '0.49000000',
      amount: '0.20000000',
      remaining: '0.05000000',
      status: 'partial',
      created_at: '2026-04-10T10:05:00.000000',
    },
    {
      id: 104,
      side: 'sell',
      price: '0.70000000',
      amount: '0.30000000',
      remaining: '0.30000000',
      status: 'open',
      created_at: '2026-04-10T10:10:00.000000',
    },
  ]

  printSection('All Mock Orders', mockOrders)
  printSection('Active Buy Orders', getActiveBuyOrders(mockOrders))
  printSection('Open Buy Orders', getOpenBuyOrders(mockOrders))
  printSection('Partial Buy Orders', getPartialBuyOrders(mockOrders))
  printSection('First Active Buy Order', findActiveBuyOrder(mockOrders))
  printSection('Find Order By ID 103', findOrderById(mockOrders, 103))
  printSection('Find Order By ID 999', findOrderById(mockOrders, 999))
}

main()