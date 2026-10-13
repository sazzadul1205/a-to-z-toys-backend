import { orderRepository } from "../models/index.js";

function aggregateCustomers(orders) {
  const customerMap = new Map();

  for (const order of orders) {
    const phone = (order.customerPhone || "").trim();
    if (!phone) continue;

    const existing = customerMap.get(phone);
    const orderTotal = order.total || order.totalPrice || 0;
    const orderPaid = order.amountPaid || 0;
    const orderBalance = Math.max(0, orderTotal - orderPaid);
    const isDue = order.paymentMethod === "due";
    const orderDate = new Date(order.createdAt);

    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += orderTotal;
      existing.totalPaid += orderPaid;
      existing.totalBalance += orderBalance;
      existing.orderIds.push(order._id);
      existing.lastOrderDate = orderDate > existing.lastOrderDate ? orderDate : existing.lastOrderDate;
      existing.firstOrderDate = orderDate < existing.firstOrderDate ? orderDate : existing.firstOrderDate;
      existing.hasDueOrders = existing.hasDueOrders || isDue;
      if (!existing.name && order.customerName) existing.name = order.customerName;
      if (!existing.email && order.customerEmail) existing.email = order.customerEmail;
      if (!existing.address && order.customerAddress) existing.address = order.customerAddress;
    } else {
      customerMap.set(phone, {
        phone,
        name: order.customerName?.trim() || "",
        email: order.customerEmail?.trim() || "",
        address: order.customerAddress?.trim() || "",
        orderCount: 1,
        totalSpent: orderTotal,
        totalPaid: orderPaid,
        totalBalance: orderBalance,
        orderIds: [order._id],
        lastOrderDate: orderDate,
        firstOrderDate: orderDate,
        hasDueOrders: isDue,
      });
    }
  }

  return Array.from(customerMap.values()).map((c) => ({
    phone: c.phone,
    name: c.name,
    email: c.email,
    address: c.address,
    orderCount: c.orderCount,
    totalSpent: Number(c.totalSpent.toFixed(2)),
    totalPaid: Number(c.totalPaid.toFixed(2)),
    totalBalance: Number(c.totalBalance.toFixed(2)),
    lastOrderDate: c.lastOrderDate.toISOString(),
    firstOrderDate: c.firstOrderDate.toISOString(),
    hasDueOrders: c.hasDueOrders,
  }));
}

export async function listCustomers(req, res) {
  try {
    const { page = 1, limit = 20, sort = "lastOrderDate", order = "desc", search = "" } = req.query;

    const orders = await orderRepository.findAll();
    let customers = aggregateCustomers(orders);

    if (search) {
      const term = search.toLowerCase().trim();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.phone.includes(term) ||
          (c.email && c.email.toLowerCase().includes(term))
      );
    }

    const sortFn = (a, b) => {
      let valA = a[sort];
      let valB = b[sort];
      if (valA instanceof Date) valA = valA.getTime();
      if (valB instanceof Date) valB = valB.getTime();
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    };
    customers.sort(sortFn);

    const total = customers.length;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const start = (pageNum - 1) * limitNum;
    const paginated = customers.slice(start, start + limitNum);

    res.json({
      customers: paginated,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function searchCustomers(req, res) {
  try {
    const { q = "", limit = 10 } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({ customers: [] });
    }

    const orders = await orderRepository.findAll();
    const customers = aggregateCustomers(orders);

    const term = q.toLowerCase().trim();
    const matches = customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.phone.includes(term)
      )
      .slice(0, Math.min(20, parseInt(limit)))
      .map((c) => ({
        phone: c.phone,
        name: c.name || "Unknown",
        orderCount: c.orderCount,
        totalBalance: c.totalBalance,
      }));

    res.json({ customers: matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCustomerDetail(req, res) {
  try {
    const { phone } = req.params;

    const orders = await orderRepository.findAll();
    const customerOrders = orders
      .filter((o) => (o.customerPhone || "").trim() === phone)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (customerOrders.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const aggregated = aggregateCustomers(customerOrders)[0];

    const orderDetails = customerOrders.map((order) => ({
      _id: order._id,
      saleNumber: order.saleNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      items: order.items?.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })) || [],
      subtotal: order.subtotal,
      discount: order.discount,
      discountType: order.discountType,
      tax: order.tax,
      total: order.total,
      amountPaid: order.amountPaid,
      change: order.change,
      balance: order.balance,
      createdAt: order.createdAt,
      cashierId: order.cashierId,
    }));

    res.json({
      ...aggregated,
      orders: orderDetails,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}