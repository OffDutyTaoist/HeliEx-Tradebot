import {
  getActiveBuyOrders,
  getPartialBuyOrders,
  findActiveBuyOrder,
  findOrderById,
} from '../core/reconciliation.js'
import type { MyOrder } from '../private-api.js'

function printSection(title: string, value: unknown) {
  console.log(`\n--- ${title} ---`)
  console.dir(value, { depth: null })
}

function main(): void {
    const mockOrders: MyOrder[] = [
    {
      id: 101,
      side: 'buy',
      price: '0.5',
      amount: '0.1',
      status: 'open',
    },
    {
      id: 102,
      side: 'buy',
      price: '0.5',
      amount: '0.1',
      status: 'partial',
    },
    {
      id: 103,
      side: 'buy',
      price: '0.5',
      amount: '0.1',
      status: 'filled',
    },
    {
      id: 104,
      side: 'sell',
      price: '0.5',
      amount: '0.1',
      status: 'open',
    },
  ]

  printSection('All Mock Orders', mockOrders)
  printSection('Active Buy Orders', getActiveBuyOrders(mockOrders))
  printSection('Open Buy Orders', getActiveBuyOrders(mockOrders))
  printSection('Partial Buy Orders', getPartialBuyOrders(mockOrders))
  printSection('First Active Buy Order', findActiveBuyOrder(mockOrders))
  printSection('Find Order By ID 103', findOrderById(mockOrders, 103))
  printSection('Find Order By ID 999', findOrderById(mockOrders, 999))
}

main()