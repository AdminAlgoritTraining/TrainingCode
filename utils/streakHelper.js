const updateStreak = async (user) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = user.lastStreak ? new Date(user.lastStreak) : null;
    if (lastActive) {
        lastActive.setHours(0, 0, 0, 0);
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Si es la primera actividad o no hay lastStreak
    if (!lastActive) {
        user.streak = 1;
        user.lastStreak = today;
    }
    // Si la última actividad fue ayer, incrementar racha
    else if (lastActive.getTime() === yesterday.getTime()) {
        user.streak += 1;
        user.lastStreak = today;
    }
    // Si la última actividad fue hoy, mantener racha
    else if (lastActive.getTime() === today.getTime()) {
        // No hacer nada, mantener racha actual
    }
    // Si han pasado más días, reiniciar racha
    else {
        user.streak = 1;
        user.lastStreak = today;
    }

    user.lastActive = new Date();
    await user.save();

    return user;
};

module.exports = { updateStreak };