import React from "react";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div>
                {children}
            </div>
        </div>
    );
};

export default AuthLayout;
