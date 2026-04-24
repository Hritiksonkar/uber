import React, { createContext, useState } from 'react'

export const ShopkeeperDataContext = createContext()

const ShopkeeperContext = ({ children }) => {
    const [shopkeeper, setShopkeeper] = useState({
        email: '',
        fullname: {
            firstname: '',
            lastname: ''
        },
        shop: {
            name: '',
            address: ''
        },
        phone: ''
    })

    return (
        <ShopkeeperDataContext.Provider value={{ shopkeeper, setShopkeeper }}>
            {children}
        </ShopkeeperDataContext.Provider>
    )
}

export default ShopkeeperContext
