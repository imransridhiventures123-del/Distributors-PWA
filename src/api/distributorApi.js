// FILE: src/api/distributorApi.js
// NEW FILE — Distributors-PWA-App
import axiosInstance from "./axiosInstance";

export const distributorLogin = (employeeId, password) =>
  axiosInstance.post("/api/distributors/auth/login", { employeeId, password }).then((r) => r.data);

export const getMyProfile = () =>
  axiosInstance.get("/api/distributors/me").then((r) => r.data);

export const getMyCustomers = () =>
  axiosInstance.get("/api/distributors/my-customers").then((r) => r.data);

// NEW — Feature: real-time distributor workflow. Add a customer directly
// from the PWA (feature #4).
export const createMyCustomer = (payload) =>
  axiosInstance.post("/api/distributors/my-customers", payload).then((r) => r.data);

// UPDATED — now also accepts an optional carryOverReason (sent only
// when the distributor already has stock but still requests the full
// amount) and an optional { finalIdlyKg, finalDosaKg } override (sent
// when the distributor agrees to only request the shortfall after
// stock is accounted for).
// UPDATED — now also accepts requestedDeliveryDate/requestedDeliveryTime
// (which day/time the distributor wants this batter delivered — picked
// on the new Request Batter flow), alongside the existing carryOverReason
// and finalIdlyKg/finalDosaKg override.
export const submitBatterRequest = (customerOrders, { carryOverReason, finalIdlyKg, finalDosaKg, requestedDeliveryDate, requestedDeliveryTime } = {}) =>
  axiosInstance.post("/api/batter-requests", { customerOrders, carryOverReason, finalIdlyKg, finalDosaKg, requestedDeliveryDate, requestedDeliveryTime }).then((r) => r.data);

export const getMyBatterRequests = () =>
  axiosInstance.get("/api/batter-requests/mine").then((r) => r.data);

// NEW — Feature: real-time distributor workflow. Batter rate catalog
// (Idly/Dosa — company cost + customer price), used to show per-kg
// rates and estimate margin while building a request/delivery.
export const getProducts = () =>
  axiosInstance.get("/api/products").then((r) => r.data);

// NEW — Feature: real-time distributor workflow. Today's Deliveries +
// margin/revenue/credit summary for the Home page.
export const submitDeliveries = (batterRequestId, records) =>
  axiosInstance.post("/api/deliveries", { batterRequestId, records }).then((r) => r.data);

export const getMyDeliveries = (date) =>
  axiosInstance.get("/api/deliveries/mine", { params: date ? { date } : {} }).then((r) => r.data);

export const getMyDeliverySummary = () =>
  axiosInstance.get("/api/deliveries/mine/summary").then((r) => r.data);

export const getMyLedger = () =>
  axiosInstance.get("/api/deliveries/mine/ledger").then((r) => r.data);

// NEW — Feature: per-customer pricing. items = [{ productKey, customerRatePerKg }]
export const updateMyCustomerPricing = (customerId, items) =>
  axiosInstance.put(`/api/distributors/my-customers/${customerId}/pricing`, { items }).then((r) => r.data);

// NEW — Feature: one-click "Today's Order" from the Customers tab (becomes a
// pending order card on the Orders tab), Mark Complete, cancel.
export const createManualOrder = (payload) =>
  axiosInstance.post("/api/deliveries/orders", payload).then((r) => r.data);

// payment = { cashAmount, onlineAmount, creditAmount } — must add up to the order amount
export const completeOrder = (id, payment) =>
  axiosInstance.put(`/api/deliveries/orders/${id}/complete`, payment).then((r) => r.data);

export const cancelManualOrder = (id) =>
  axiosInstance.delete(`/api/deliveries/orders/${id}`).then((r) => r.data);

// NEW — Ledger "Receive Payment": customer pays old credit. mode = "cash" | "online"
export const receivePayment = (payload) =>
  axiosInstance.post("/api/deliveries/receipts", payload).then((r) => r.data);

// NEW — Feature: "Request Product" (Home page button). items = [{ productKey, qty }]
// Price is never sent — the server takes it from the admin's catalog.
export const createProductRequest = (payload) =>
  axiosInstance.post("/api/product-requests", payload).then((r) => r.data);

export const getMyProductRequests = () =>
  axiosInstance.get("/api/product-requests/mine").then((r) => r.data);

// NEW — Feature: notifications (bell icon on Home)
export const getMyNotifications = () =>
  axiosInstance.get("/api/notifications").then((r) => r.data);

export const getUnreadNotificationCount = () =>
  axiosInstance.get("/api/notifications/unread-count").then((r) => r.data);

export const markAllNotificationsRead = () =>
  axiosInstance.put("/api/notifications/read-all").then((r) => r.data);
  axiosInstance.post("/api/deliveries/receipts", payload).then((r) => r.data);
