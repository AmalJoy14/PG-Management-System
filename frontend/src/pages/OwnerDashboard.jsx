"use client"

import { useState, useEffect } from "react"
import Sidebar from "../components/Sidebar"
import axiosInstance from "../api/axios"
import styles from "./OwnerDashboard.module.css"

const OwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState("tenants")
  const [tenants, setTenants] = useState([])
  const [payments, setPayments] = useState([])
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showAddTenant, setShowAddTenant] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [onlyUnpaid, setOnlyUnpaid] = useState(true)
  const [selectedComplaintTenant, setSelectedComplaintTenant] = useState("")
  const [onlyPendingComplaints, setOnlyPendingComplaints] = useState(true)
  const [newTenant, setNewTenant] = useState({
    name: "",
    email: "",
    password: "",
    roomNumber: "",
    rentAmount: "",
    joinDate: "",
  })
  const [rooms, setRooms] = useState([])
  const [useCustomRoom, setUseCustomRoom] = useState(false)
  const [customRoom, setCustomRoom] = useState("")

  const tabs = [
    { id: "tenants", label: "Tenants" },
    { id: "payments", label: "Payments" },
    { id: "complaints", label: "Complaints" },
  ]

  useEffect(() => {
    fetchData()
  }, [activeTab])

  useEffect(() => {
    if (activeTab === "payments") {
      fetchData()
    }
  }, [selectedTenant, selectedMonth, onlyUnpaid])

  useEffect(() => {
    if (activeTab === "complaints") {
      fetchData()
    }
  }, [selectedComplaintTenant, onlyPendingComplaints])

  const fetchData = async () => {
    setLoading(true)
    setError("")
    try {
      if (activeTab === "tenants") {
        const response = await axiosInstance.get("/tenants")
        setTenants(response.data.tenants || [])
        // Load rooms for dropdown
        try {
          const roomsRes = await axiosInstance.get("/rooms")
          setRooms(roomsRes.data || [])
        } catch (e) {
          // non-fatal for tenants view
        }
      } else if (activeTab === "payments") {
        // Load tenants for dropdown
        const tenantsResponse = await axiosInstance.get("/tenants")
        setTenants(tenantsResponse.data.tenants || [])
        
        // Load payments with optional tenant filter
        const params = new URLSearchParams()
        if (selectedTenant) params.append("tenantId", selectedTenant)
        if (selectedMonth) params.append("month", selectedMonth)
        if (onlyUnpaid) params.append("unpaid", "1")
        const url = params.toString() ? `/payments?${params.toString()}` : "/payments"
        const response = await axiosInstance.get(url)
        setPayments(response.data)
      } else if (activeTab === "complaints") {
        // Load tenants for dropdown
        const tenantsResponse = await axiosInstance.get("/tenants")
        setTenants(tenantsResponse.data.tenants || [])

        const params = new URLSearchParams()
        if (selectedComplaintTenant) params.append("tenantId", selectedComplaintTenant)
        if (onlyPendingComplaints) params.append("status", "pending")
        const url = params.toString() ? `/complaints?${params.toString()}` : "/complaints"

        const response = await axiosInstance.get(url)
        setComplaints(response.data)
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const handleAddTenant = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const payload = {
        ...newTenant,
        roomNumber: useCustomRoom ? customRoom : newTenant.roomNumber,
      }
      await axiosInstance.post("/add-tenant", payload)
      setNewTenant({ name: "", email: "", password: "", roomNumber: "", rentAmount: "", joinDate: "" })
      setUseCustomRoom(false)
      setCustomRoom("")
      setShowAddTenant(false)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add tenant")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateComplaintStatus = async (complaintId, newStatus) => {
    try {
      await axiosInstance.patch(`/complaints/${complaintId}`, { status: newStatus })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update complaint")
    }
  }

  const handleGeneratePayments = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await axiosInstance.post("/payments/generate-all")
      alert(response.data.message)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate payments")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {activeTab === "tenants" && "Tenants Management"}
            {activeTab === "payments" && "Payment Status"}
            {activeTab === "complaints" && "Maintenance Complaints"}
          </h1>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {activeTab === "tenants" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>All Tenants</h2>
              <button onClick={() => setShowAddTenant(!showAddTenant)} className={styles.addButton}>
                {showAddTenant ? "Cancel" : "Add New Tenant"}
              </button>
            </div>

            {showAddTenant && (
              <div className={styles.formCard}>
                <h3>Add New Tenant</h3>
                <form onSubmit={handleAddTenant} className={styles.form}>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                    required
                    className={styles.input}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newTenant.email}
                    onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                    required
                    className={styles.input}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newTenant.password}
                    onChange={(e) => setNewTenant({ ...newTenant, password: e.target.value })}
                    required
                    minLength="6"
                    className={styles.input}
                  />
                  {!useCustomRoom ? (
                    <select
                      value={newTenant.roomNumber}
                      onChange={(e) => setNewTenant({ ...newTenant, roomNumber: e.target.value })}
                      required
                      className={styles.select}
                    >
                      <option value="" disabled>Select Room</option>
                      {rooms.map((room) => (
                        <option
                          key={room.id || room._id || room.roomNumber}
                          value={room.roomNumber}
                          disabled={!room.available}
                          style={{ color: room.available ? '#27ae60' : '#c0392b' }}
                        >
                          {room.roomNumber} {room.available ? '(Available)' : '(Occupied)'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Enter Room Number"
                      value={customRoom}
                      onChange={(e) => setCustomRoom(e.target.value)}
                      required
                      className={styles.input}
                    />
                  )}
                  <label className={styles.inlineToggle}>
                    <input
                      type="checkbox"
                      checked={useCustomRoom}
                      onChange={(e) => setUseCustomRoom(e.target.checked)}
                    />
                    <span> Enter custom room number</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Rent Amount"
                    value={newTenant.rentAmount}
                    onChange={(e) => setNewTenant({ ...newTenant, rentAmount: e.target.value })}
                    required
                    className={styles.input}
                  />
                  <div className={styles.dateInputGroup}>
                    <input
                      type="date"
                      placeholder="Join Date"
                      value={newTenant.joinDate}
                      onChange={(e) => setNewTenant({ ...newTenant, joinDate: e.target.value })}
                      required
                      className={styles.input}
                    />
                    <button
                      type="button"
                      onClick={() => setNewTenant({ ...newTenant, joinDate: new Date().toISOString().split('T')[0] })}
                      className={styles.todayButton}
                    >
                      Today
                    </button>
                  </div>
                  <button type="submit" disabled={loading} className={styles.submitButton}>
                    {loading ? "Adding..." : "Add Tenant"}
                  </button>
                </form>
              </div>
            )}

            {loading ? (
              <div className={styles.loading}>Loading tenants...</div>
            ) : (
              <div className={styles.table}>
                <table>
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Room Number</th>
                      <th>Rent Amount</th>
                      <th>Join Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.length === 0 ? (
                      <tr>
                        <td colSpan="5" className={styles.empty}>
                          No tenants found
                        </td>
                      </tr>
                    ) : (
                      tenants.map((tenant) => (
                        <tr key={tenant._id}>
                          <td>{tenant.name}</td>
                          <td>{tenant.email}</td>
                          <td>{tenant.roomNumber}</td>
                          <td>₹{tenant.rentAmount}</td>
                          <td>{new Date(tenant.joinDate).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Payment Records</h2>
              <div className={styles.paymentControls}>
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className={styles.tenantSelect}
                >
                  <option value="">All Tenants</option>
                  {tenants.map((tenant) => (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.name} - Room {tenant.roomNumber}
                    </option>
                  ))}
                </select>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={styles.tenantSelect}
                />
                <label className={styles.inlineToggle}>
                  <input
                    type="checkbox"
                    checked={onlyUnpaid}
                    onChange={(e) => setOnlyUnpaid(e.target.checked)}
                  />
                  <span>Only unpaid</span>
                </label>
                <button onClick={handleGeneratePayments} className={styles.generateButton}>
                  Generate Payment Records
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className={styles.loading}>Loading payments...</div>
            ) : (
              <div className={styles.table}>
                <table>
                  <thead>
                    <tr>
                      <th>Tenant Name</th>
                      <th>Room</th>
                      <th>Month</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                      <th>Paid Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan="7" className={styles.empty}>
                          No payment records found. Click "Generate Payment Records" to create them.
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>{payment.tenant_name || "N/A"}</td>
                          <td>{payment.room_number}</td>
                          <td>{payment.month}</td>
                          <td>₹{payment.amount}</td>
                          <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
                          <td>{payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : "-"}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[payment.status]}`}>{payment.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "complaints" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Maintenance Complaints</h2>
              <div className={styles.paymentControls}>
                <select
                  value={selectedComplaintTenant}
                  onChange={(e) => setSelectedComplaintTenant(e.target.value)}
                  className={styles.tenantSelect}
                >
                  <option value="">All Tenants</option>
                  {tenants.map((tenant) => (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.name} - Room {tenant.roomNumber}
                    </option>
                  ))}
                </select>
                <label className={styles.inlineToggle}>
                  <input
                    type="checkbox"
                    checked={onlyPendingComplaints}
                    onChange={(e) => setOnlyPendingComplaints(e.target.checked)}
                  />
                  <span>Only pending</span>
                </label>
              </div>
            </div>
            {loading ? (
              <div className={styles.loading}>Loading complaints...</div>
            ) : (
              <div className={styles.complaintsGrid}>
                {complaints.length === 0 ? (
                  <div className={styles.empty}>No complaints found</div>
                ) : (
                  complaints.map((complaint) => (
                    <div key={complaint.id} className={styles.complaintCard}>
                      <div className={styles.complaintHeader}>
                        <span className={styles.complaintUser}>{complaint.tenant_name || "Unknown Tenant"}</span>
                        <span className={styles.complaintRoom}>Room {complaint.room_number || "N/A"}</span>
                        <span className={styles.complaintDate}>
                          {new Date(complaint.createdAt || complaint.created_at).toLocaleDateString()}
                        </span>
                        <span className={`${styles.badge} ${styles[complaint.status]}`}>{complaint.status}</span>
                      </div>
                      <p className={styles.complaintText}>{complaint.complaint}</p>
                      <div className={styles.complaintActions}>
                        {complaint.status === "pending" && (
                          <button
                            onClick={() => handleUpdateComplaintStatus(complaint.id, "resolved")}
                            className={styles.resolveButton}
                          >
                            Mark as Resolved
                          </button>
                        )}
                        {complaint.status === "resolved" && (
                          <button
                            onClick={() => handleUpdateComplaintStatus(complaint.id, "pending")}
                            className={styles.pendingButton}
                          >
                            Mark as Pending
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default OwnerDashboard
