import React, { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../config'
import { ShopkeeperDataContext } from '../context/ShopkeeperContext'

const ShopkeeperHome = () => {
    const { shopkeeper } = useContext(ShopkeeperDataContext)
    const [requests, setRequests] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    const token = localStorage.getItem('token')

    async function fetchRequests() {
        setIsLoading(true)
        setError('')
        try {
            const response = await axios.get(`${API_BASE_URL}/delivery-requests/shopkeeper`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setRequests(Array.isArray(response.data) ? response.data : [])
        } catch (e) {
            setError(e?.response?.data?.message || 'Failed to load requests')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    async function acceptRequest(requestId) {
        try {
            await axios.post(`${API_BASE_URL}/delivery-requests/${requestId}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setRequests((prev) => prev.filter((r) => r._id !== requestId))
        } catch (e) {
            alert(e?.response?.data?.message || 'Failed to accept request')
        }
    }

    return (
        <div className='min-h-screen p-6 bg-white'>
            <div className='flex items-center justify-between'>
                <div>
                    <div className='text-2xl font-semibold'>Shopkeeper Panel</div>
                    <div className='text-sm text-gray-600'>{shopkeeper?.shop?.name} • {shopkeeper?.shop?.address}</div>
                </div>
                <div className='flex gap-2'>
                    <button onClick={fetchRequests} className='bg-gray-200 px-3 py-2 rounded-lg'>Refresh</button>
                    <Link to='/shopkeeper/logout' className='bg-black text-white px-3 py-2 rounded-lg'>Logout</Link>
                </div>
            </div>

            <div className='mt-6'>
                <h3 className='text-lg font-medium mb-3'>Delivery Requests</h3>

                {isLoading && <div>Loading...</div>}
                {!isLoading && error && <div className='text-red-600'>{error}</div>}

                {!isLoading && !error && requests.length === 0 && (
                    <div className='text-gray-600'>No requests yet.</div>
                )}

                <div className='flex flex-col gap-3'>
                    {requests
                        .filter((r) => r.status === 'requested')
                        .map((r) => (
                            <div key={r._id} className='border rounded-lg p-4'>
                                <div className='flex items-center justify-between'>
                                    <div className='font-medium'>Request from {r.user?.fullname?.firstname} {r.user?.fullname?.lastname}</div>
                                    <div className='text-sm text-gray-600'>{new Date(r.createdAt).toLocaleString()}</div>
                                </div>
                                <div className='mt-2 text-sm'>
                                    <div><span className='font-medium'>Dropoff:</span> {r.dropoffAddress}</div>
                                    <div><span className='font-medium'>Vehicle:</span> {r.vehicleType}</div>
                                    {r.note ? <div><span className='font-medium'>Note:</span> {r.note}</div> : null}
                                </div>

                                <button
                                    onClick={() => acceptRequest(r._id)}
                                    className='mt-3 bg-green-600 text-white font-semibold px-4 py-2 rounded-lg w-full'
                                >Accept & Send To Captains</button>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    )
}

export default ShopkeeperHome
