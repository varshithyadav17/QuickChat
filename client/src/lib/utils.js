export function formatMessageTime(date){
    return new Date(date).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: false});
}

export const formatLastSeen = (lastSeen) => {

    if(!lastSeen) return ""

    const now = new Date()
    const seen = new Date(lastSeen)

    const diffMs = now - seen

    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if(diffMinutes < 1){
        return "just now"
    }

    if(diffMinutes < 60){
        return `${diffMinutes} min${diffMinutes > 1 ? "s" : ""} ago`
    }

    if(diffHours < 24){
        return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    if(seen.toDateString() === yesterday.toDateString()){
        return `yesterday at ${seen.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
        })}`
    }

    return seen.toLocaleDateString([], {
        month: "short",
        day: "numeric"
    }) + " at " +
    seen.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    })

}