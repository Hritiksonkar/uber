import React from 'react'

const LocationSearchPanel = ({
    suggestions,
    setVehiclePanel,
    setPanelOpen,
    setPickup,
    setDestination,
    setPickupPlaceId,
    setDestinationPlaceId,
    activeField
}) => {

    const getSuggestionLabel = (suggestion) => {
        if (!suggestion) return '';
        if (typeof suggestion === 'string') return suggestion;
        return suggestion.description || '';
    };

    const getSuggestionPlaceId = (suggestion) => {
        if (!suggestion || typeof suggestion === 'string') return null;
        return suggestion.placeId || null;
    };

    const handleSuggestionClick = (suggestion) => {
        const label = getSuggestionLabel(suggestion);
        const placeId = getSuggestionPlaceId(suggestion);

        if (activeField === 'pickup') {
            setPickup(label)
            if (typeof setPickupPlaceId === 'function') {
                setPickupPlaceId(placeId);
            }
        } else if (activeField === 'destination') {
            setDestination(label)
            if (typeof setDestinationPlaceId === 'function') {
                setDestinationPlaceId(placeId);
            }
        }
        // setVehiclePanel(true)
        // setPanelOpen(false)
    }

    return (
        <div>
            {/* Display fetched suggestions */}
            {
                suggestions.map((elem, idx) => (
                    <div key={idx} onClick={() => handleSuggestionClick(elem)} className='flex gap-4 border-2 p-3 border-gray-50 active:border-black rounded-xl items-center my-2 justify-start'>
                        <h2 className='bg-[#eee] h-8 flex items-center justify-center w-12 rounded-full'><i className="ri-map-pin-fill"></i></h2>
                        <h4 className='font-medium'>{getSuggestionLabel(elem)}</h4>
                    </div>
                ))
            }
        </div>
    )
}

export default LocationSearchPanel