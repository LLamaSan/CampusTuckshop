let resetToken = null;

// Get token from URL
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    resetToken = urlParams.get('token');

    if (!resetToken) {
        showAlert('Invalid or missing reset token. Please request a new password reset link.', 'alert-error');
        document.getElementById('passwordResetForm').style.display = 'none';
        return;
    }

    // Verify token
    verifyResetToken();
};

async function verifyResetToken() {
    try {
        const response = await fetch('/api/password/verify-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: resetToken }),
        });

        const data = await response.json();

        if (!data.success) {
            showAlert('This reset link is invalid or has expired. Please request a new one.', 'alert-error');
            document.getElementById('passwordResetForm').style.display = 'none';
        }
    } catch (error) {
        console.error('Token verification error:', error);
        showAlert('Error verifying reset link. Please try again.', 'alert-error');
    }
}

// Handle password reset form submission
document.getElementById('passwordResetForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate passwords
    if (newPassword.length < 6) {
        showAlert('Password must be at least 6 characters long', 'alert-error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match', 'alert-error');
        return;
    }

    try {
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span> Resetting...';

        const response = await fetch('/api/password/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: resetToken,
                newPassword: newPassword
            }),
        });

        const data = await response.json();

        if (data.success) {
            // Show success message
            document.getElementById('resetForm').classList.add('hidden');
            document.getElementById('successMessage').classList.remove('hidden');
        } else {
            showAlert(data.message || 'Failed to reset password', 'alert-error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }

    } catch (error) {
        console.error('Reset password error:', error);
        showAlert('Network error. Please try again.', 'alert-error');
        
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';
    }
});

function showAlert(message, type) {
    const alert = document.getElementById('resetAlert');
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'block';

    // Auto-hide after 10 seconds
    setTimeout(() => {
        alert.style.display = 'none';
    }, 10000);
}
