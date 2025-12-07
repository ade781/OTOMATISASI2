import User from "../models/UserModel.js";

(async () => {
    const admin = await User.findOne({ where: { username: "admin" } });

    if (!admin) {
        console.log("Admin user not found");
        process.exit(1);
    }

    console.log(JSON.stringify({ username: admin.username, password: admin.password, role: admin.role }));
    process.exit(0);
})().catch((err) => {
    console.error("Failed to fetch admin user", err);
    process.exit(1);
});