import User from "../models/UserModel.js";

const ensureAdmin = async () => {
    await User.sync({ alter: true });

    const [user, created] = await User.findOrCreate({
        where: { username: "admin" },
        defaults: { password: "aaa", role: "admin" },
    });

    return created
        ? "Admin user created with username admin and password aaa"
        : "Admin user already exists";
};

ensureAdmin()
    .then((message) => {
        console.log(message);
        process.exit(0);
    })
    .catch((err) => {
        console.error("Failed to ensure admin user", err);
        process.exit(1);
    });