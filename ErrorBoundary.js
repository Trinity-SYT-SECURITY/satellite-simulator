import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="alert alert-danger">
                    <h3>系統發生錯誤</h3>
                    <p>{this.state.error.toString()}</p>
                    <button 
                        className="btn btn-primary"
                        onClick={() => window.location.reload()}
                    >
                        重新載入
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
