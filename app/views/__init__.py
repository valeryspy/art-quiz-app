from flask import Blueprint, render_template, session, redirect, url_for

views_bp = Blueprint('views', __name__)

@views_bp.route('/')
def index():
    return render_template('dashboard.html')

@views_bp.route('/quiz')
def quiz():
    if 'username' not in session:
        return redirect(url_for('views.index'))
    return render_template('quiz.html')

@views_bp.route('/browse')
def browse():
    if 'username' not in session:
        return redirect(url_for('views.index'))
    return render_template('browse.html')

@views_bp.route('/editors')
def editors():
    if 'username' not in session:
        return redirect(url_for('views.index'))
    return render_template('editors.html')

@views_bp.route('/collection')
def collection():
    if 'username' not in session:
        return redirect(url_for('views.index'))
    return render_template('collection.html')
